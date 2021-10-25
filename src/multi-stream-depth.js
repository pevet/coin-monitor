#!/usr/bin/env node

import logger from './lib/logger';
import SocketClient from './lib/socketClient';

export default async function createApp() {
  logger.info('Start application');

  let pairs = [
    'ethbtc',
    'ltcbtc',
    'bnbbtc',
  ];

  pairs = pairs.map((pair) => `${pair}@ticker`).join('/');
  logger.info(pairs);

  const socketApi = new SocketClient(`stream?streams=${pairs}`);
  socketApi.setHandler('24hrTicker', (params) => logger.info(JSON.stringify(params)));
}

createApp();
