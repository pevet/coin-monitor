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

let db = await mysql.createConnection({
  host: "localhost",
  user: "coinmonitor",
  password: "%[9n6$-?+/fL.UH]",
  database: "coinscanner"
});

let con = await db.connect(function(err) {
  if (err) throw err;
  logger.debug("Database Connected!");
});

let pairs = await getPairs(db);
logger.debug("1#"+pairs+"#");


//pairs="btcusdt@ticker/ethusdt@ticker";

let pairs2 = [
  'btcusdt',
  'ethusdt',
//  'bnbbtc',
];

  pairs2 = pairs2.map((pair) => `${pair}@ticker`).join('/');
  logger.debug("2*"+pairs2+"*");

  var socketApi = await subscribeToStream(pairs,msgType);
  logger.debug("3#"+pairs+"#");

  setInterval(() => {
    if (socketApi._ws.readyState === WebSocket.CLOSED) {
      logger.debug("Websocket is closed, trying to resubscribe");
      socketApi = subscribeToStream(pairs,msgType);
    }
  }, 2000);
}

function subscribeToStream(pairs, msgType) {
  const socketApi = new SocketClient(`stream?streams=${pairs}`);
  socketApi.setHandler(msgType, (params) => storeTicker(params));
  logger.debug("subscribed to stream "+pairs);
  return socketApi;
}

function storeTicker(params) {
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
    logger.debug("1#"+pairs+"#");
  });
  logger.debug("0#"+pairs+"#");
  return pairs;
}

createApp();
