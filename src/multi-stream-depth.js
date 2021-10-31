#!/usr/bin/env node

import logger from './lib/logger';
import SocketClient from './lib/socketClient';
import WebSocket from 'ws';

var logFS = require('fs');
var logUtil = require('util');
var logFile = logFS.createWriteStream('coinmonitor.log', { flags: 'w' });
  // Or 'w' to truncate the file every time the process starts.
var logStdout = process.stdout;

console.log = function () {
  logFile.write(logUtil.format.apply(null, arguments) + '\n');
  logStdout.write(logUtil.format.apply(null, arguments) + '\n');
}
console.error = console.log;

let mysql = require('mysql');
let db = mysql.createConnection({
  host: "localhost",
  user: "coinmonitor",
  password: "%[9n6$-?+/fL.UH]",
  database: "coinscanner"
});

export default async function createApp() {
  let msgType='24hrTicker';
  logger.debug('Start application for '+msgType);
  var pairs;
  var socketApi;
  db.connect();
  logger.debug("Database Connected!");

  var sql = "SELECT symbol FROM pairs WHERE active = 1";
  var result = db.query(sql);

  pairs = result.map((row) => `${row.symbol}@ticker`).join('/');
  pairs = pairs.toLowerCase();
//      logger.debug("5#"+pairs+"#");

  socketApi = subscribeToStream(pairs,msgType);

  setInterval(() => {
    if (socketApi._ws.readyState === WebSocket.CLOSED) {
      logger.debug("Websocket is closed, trying to resubscribe");
      socketApi = subscribeToStream(pairs,msgType);
    }
  }, 2000);

  setInterval(() => { //force close the stream after 12 hrs and re-subscribe to keep stream alive
    logger.debug("Closing stream");
    socketApi._ws.close();
  }, 12*60*60*1000);
}

function subscribeToStream(pairs, msgType) {
  const socketApi = new SocketClient(`stream?streams=${pairs}`);
  socketApi.setHandler(msgType, (params) => storeTicker(params));
  logger.debug("subscribed to stream");
  return socketApi;
}

function storeTicker(params) {
  logger.info(params);
  var sql = "INSERT INTO ticker (symbol, price, time) VALUES ('"+params.s+"', '"+params.c+"', '"+params.E+"')";
  db.query(sql, function (err, result) {
    if (err) {
      if (err.errno == 1062) { //ignore duplicate entry error due to async execution
        logger.warn("Duplicate record "+params.s+"@"+params.c+":"+params.E);
      } else throw err;
    }
//    logger.info("Inserted: "+sql);
  });
}

createApp();
