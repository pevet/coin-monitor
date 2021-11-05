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

//showMemory();

let mysql = require('mysql');
let db = mysql.createConnection({
  host: "localhost",
  user: "coinmonitor",
  password: "%[9n6$-?+/fL.UH]",
  database: "coinscanner"
});

let msgType='24hrTicker';
logger.debug('Start application for '+msgType);
var pairs;
var socketApi;
db.connect(function(err) {
  if (err) throw err;
  logger.debug("Database Connected!");

  var sql = "SELECT symbol FROM pairs WHERE active = 1 LIMIT=100";
  db.query(sql, function (err, result) {
    if (err) throw err;

    pairs = result.map((row) => `${row.symbol}@ticker`).join('/');
    pairs = pairs.toLowerCase();
//      logger.debug("5#"+pairs+"#");

    socketApi = subscribeToStream(pairs,msgType);
  });
});

setInterval(() => {
  if (socketApi._ws.readyState === WebSocket.CLOSED) {
    logger.debug("Websocket is closed, trying to resubscribe");
    socketApi = subscribeToStream(pairs,msgType);
  }
}, 2000);

setInterval(() => { //force close the stream after 12 hrs and re-subscribe to keep stream alive
  logger.debug("Closing stream");
  socketApi._ws.close();
}, 12*60*60*1000); //12 hours

function subscribeToStream(pairs, msgType) {
  const sApi = new SocketClient(`stream?streams=${pairs}`);
  sApi.setHandler(msgType, (params) => storeTicker(params));
  logger.debug("subscribed to stream");
  return sApi;
};

function storeTicker(params) {
  logger.info(params);
  var sql = "INSERT INTO ticker (symbol, price, time) VALUES ('"+params.s+"', '"+params.c+"', '"+params.E+"')";
  db.query(sql, function (err, result) {
    if (err) {
      if (err.errno == 1062) { //ignore duplicate entry error due to async execution
        logger.warn("Duplicate record "+params.s+"@"+params.c+":"+params.E);
      } else throw err;
    }
    logger.info("Inserted: "+sql);
//    showMemory();
  });
};

function showMemory(){
  const used = process.memoryUsage();
  for (let key in used) {
    logger.debug(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
}
