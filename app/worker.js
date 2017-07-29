const _ = require('lodash');
const logger = require('./tools/logger');
const eventBus = require('./tools/eventBus');
const eventHandler = require('./tools/cluster');

module.exports = function Worker() {
  // worker
  const msgHandler = (data) => {
    const type = _.get(data, 'type');
    if (type === 'shutdown') {
      // initiate graceful close of any connections to server
      logger.silly('worker: initialize graceful worker exit..');
      process.exit();
    } else if (type === 'event') {
      logger.silly('worker: Event from master');
      eventHandler(data);
    }
  };
  process.on('message', msgHandler);

  logger.info(`Worker ${process.pid} started`);

  eventBus.on('*', (event, data) => {
    logger.silly(`Worker: eventBus("*" ${event}, ${data})`);
  });

  // test event bus
  setTimeout(() => { eventBus.emit('hello', `Worker: ${process.pid}`); }, 100);

  /*
  // test logger
  let i = 0;
  setInterval(() => { logger.info(`${process.pid}: i:${i += 1}`); }, 2000);

  // test worker exit
  setTimeout(() => { process.exit(); }, Math.random() * 10000);
  */
  // const app = require('.');
};
