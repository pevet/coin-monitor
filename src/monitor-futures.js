#!/usr/bin/env node

import logger from './lib/logger';

var logFS = require('fs');
var logUtil = require('util');
var logFile = logFS.createWriteStream('coinscanner.log', { flags: 'w' });
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
  logger.debug('Start coinscanner');

  var pairs;
  db.connect(function(err) {
    if (err) throw err;
    logger.debug("Database Connected!");

    var sql = "SELECT symbol FROM pairs WHERE active = 1";
    db.query(sql, function (err, result) {
      if (err) throw err;
      pairs = result.map((row) => `${row.symbol}`);
    });

    do {
      pairs.foreach(scanPair);
    } while (1);
  });
}

function scanPair(symbol) {
  // 1. load unfinished wiggle
  // 2. if there's no unfinished wiggle, create an empty wiggle record

  var sql = "INSERT INTO ticker (symbol, price, time) VALUES ('"+params.s+"', '"+params.c+"', '"+params.E+"')";
  db.query(sql, function (err, result) {
    if (err) {
      if (err.errno == 1062) { //ignore duplicate entry error due to async execution
        logger.warn("Duplicate record "+params.s+"@"+params.c+":"+params.E);
      } else throw err;
    }
    logger.info("Inserted: "+sql);
  });
}

createApp();
