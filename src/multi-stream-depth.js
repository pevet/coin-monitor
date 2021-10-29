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

export default async function createApp() {
  let msgType='24hrTicker';
  logger.debug('Start application for '+msgType);

  let db = mysql.createConnection({
    host: "localhost",
    user: "coinmonitor",
    password: "%[9n6$-?+/fL.UH]",
    database: "coinscanner"
  });

  var pairs;
  var socketApi;
  db.connect(function(err) {
    if (err) throw err;
    logger.debug("Database Connected!");

    var sql = "SELECT symbol FROM pairs WHERE active = 1";
    db.query(sql, function (err, result) {
      if (err) throw err;

      pairs = result.map((row) => `${row.symbol}@ticker`).join('/');
      pairs = pairs.toLowerCase();
      logger.debug("5#"+pairs+"#");

      socketApi = subscribeToStream(pairs,msgType);

      setInterval(() => {
        if (socketApi._ws.readyState === WebSocket.CLOSED) {
          logger.debug("Websocket is closed, trying to resubscribe");
          socketApi = subscribeToStream(pairs,msgType);
        }
      }, 2000);
    });
  });
}

function subscribeToStream(db, pairs, msgType) {
  const socketApi = new SocketClient(`stream?streams=${pairs}`);
  socketApi.setHandler(msgType, (params) => storeTicker(db, params));
  logger.debug("subscribed to stream "+pairs);
  return socketApi;
}

function storeTicker(db, params) {
  logger.debug(params);
  var sql = "INSERT INTO ticker (symbol, price, time) VALUES ('"+params.s+"', '"+params.c+"', '"+params.E+"')";
  db.query(sql, function (err, result) {
    if (err) throw err;
    logger.info("Inserted: "+sql);
  });
}

function getPairs(db) {
  var sql = "SELECT symbol FROM pairs WHERE active = 1";
  var pairs;

  db.query(sql, function (err, result) {
    if (err) throw err;
    pairs = result.map((row) => `${row.symbol}@ticker`).join('/');
    pairs = pairs.toLowerCase();
    logger.debug("5#"+pairs+"#");
  });
  logger.debug("6#"+pairs+"#");
  return pairs;
}

createApp();
