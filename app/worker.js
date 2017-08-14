const _ = require('lodash');
const cluster = require('cluster');
const logger = require('./tools/logger');
const eventBus = require('./tools/eventBus');

module.exports = function Worker() {
  // worker
  const msgHandlers = {
    shutdown: process.exit,
    event: eventBus.clusterEventHandler
  };

  process.on('message', (data) => {
    const type = _.get(data, 'type');
    if (_.has(msgHandlers, type)) {
      try {
        msgHandlers[type](cluster.worker, data);
      } catch (error) {
        logger.error(`Failed to process event: ${error.stack} | ${JSON.stringify(data)}`);
      }
    } else {
      logger.warn(`Unknown message type "${type}" to worker`);
    }
  });

  logger.info(`Process: ${process.pid} started`);
  eventBus.on('*', (eventName, meta, ...data) => {
    logger.verbose(`[eventBus] ${eventName} ${JSON.stringify(meta)}: ${JSON.stringify(data)})`);
  });

  /*
  // test event bus
  if (cluster.worker.id === 1) {
    setInterval(() => {
      eventBus.emit('helloEvent', {msg: `Worker: ${process.pid}`});
    }, 5000);
  }

  // test logger
  let i = 0;
  setInterval(() => { logger.info(`${process.pid}: i:${i += 1}`); }, 2000);

  // test worker exit
  setTimeout(() => { process.exit(); }, Math.random() * 10000);
  */

  this.app = require('.'); // eslint-disable-line global-require
};
