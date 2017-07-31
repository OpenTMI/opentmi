const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const nconf = require('nconf');
const _ = require('lodash');

const logger = require('./tools/logger');
const eventBus = require('./tools/eventBus');
const eventHandler = require('./tools/cluster');


module.exports = function Master() {
  logger.level = 'silly';

  logger.info(`Master ${process.pid} is running`);


  const logHandler = function (data) {
    const level = _.get(data, 'level', 'debug');
    const args = _.get(data, 'args', []);
    args.unshift(`Worker#${this.id}`);
    logger[level](...args);
  };

  const statusHandler = function (data) {
    const workers = _.map(cluster.workers, (worker, id) => (
      {isDead: worker.isDead(),
        isConnected: worker.isConnected(),
        pid: worker.process.pid,
        id: id}));
    eventBus.emit(data.id, {workers});
  };

  const msgHandlers = {
    log: logHandler,
    event: eventHandler
  };

  eventBus.on('masterStatus', statusHandler);

  eventBus.on('*', (event, data) => {
    logger.debug(`Master: eventBus(${event}, ${JSON.stringify(data)})`);
  });

  const fork = () => {
    const worker = cluster.fork();

    // test exit..
    worker.exitedAfterDisconnect = Math.round((Math.random() * 100)) % 2 === 0;

    worker.on('message', (data) => {
      const type = _.get(data, 'type');
      if (_.has(msgHandlers, type)) {
        msgHandlers[type].call(worker, data);
      } else {
        logger.warn(`Unknown message type "${type}" from worker`);
      }
    });
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

  // handle craceful exit
  process.on('SIGINT', () => {
    const promiseKill = worker => new Promise((resolve) => {
      worker.once('exit', resolve);
      worker.kill();
    });
    const pending = _.map(cluster.workers, worker => promiseKill(worker));
    Promise.all(pending).then(() => {
      logger.info('All workers closed. Exit app.');
      process.exit();
    });
  });
  /*
  // test eventBus from master to workers
  setInterval(() => {
    eventBus.emit('helloEvent', {msg: `Master: ${process.pid}`});
  }, 5000); */
};
