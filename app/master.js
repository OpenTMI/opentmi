const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const _ = require('lodash');
const logger = require('./tools/logger');
const eventBus = require('./tools/eventBus');
const eventHandler = require('./tools/cluster');


module.exports = function Master() {
  logger.level = 'silly';

  logger.info(`Master ${process.pid} is running`);

  const logHandler = (data) => {
    const level = _.get(data, 'level', 'debug');
    const args = _.get(data, 'args');
    logger[level](...args);
  };

  const msgHandler = function (data) {
    const type = _.get(data, 'type');
    if (type === 'log') logHandler(data);
    else if (type === 'event') {
      eventHandler.bind(this)(data);
    }
  };

  eventBus.on('*', (event, data) => {
    logger.silly(`Master: eventBus("*" ${event}, ${data})`);
  });

  const fork = () => {
    const worker = cluster.fork();

    // test exit..
    worker.exitedAfterDisconnect = Math.round((Math.random() * 100)) % 2 === 0;

    worker.on('message', msgHandler.bind(worker));
    worker.on('exit', (code, signal) => {
      if (signal) {
        logger.warn(`worker was killed by signal: ${signal}`);
      } else if (code !== 0) {
        logger.warn(`worker exited with error code: ${code}`);
      } else {
        logger.info('worker success!');
      }
    });
  };

  // Fork workers.
  _.times(numCPUs, fork);

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`worker ${worker.process.pid} died${signal ? `by signal: ${signal}` : ''}`);
    if (worker.exitedAfterDisconnect === false) {
      // restart worker
      logger.info('restart worker');
      fork();
    } else {
      logger.info('Worker was not purpose to restart');
    }
  });
};
