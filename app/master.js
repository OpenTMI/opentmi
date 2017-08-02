const cluster = require('cluster');
const os = require('os');

const numCPUs = os.cpus().length;
const _ = require('lodash');
const chokidar = require('chokidar');
const Promise = require('bluebird');


const logger = require('./tools/logger');
const eventBus = require('./tools/eventBus');
const eventHandler = require('./tools/cluster');

const autoReload = true; // @todo get from config file


module.exports = function Master() {
  logger.level = 'silly';

  logger.info(`Master ${process.pid} is running`);

  const logHandler = function (data) {
    const level = _.get(data, 'level', 'debug');
    const args = _.get(data, 'args', []);
    args.unshift(`Worker#${this.id}`);
    logger[level](...args);
  };

  const getStats = () => {
    const master = {};
    master.hostname = os.hostname();
    master.os = `${os.type()} ${os.release()}`;
    master.averageLoad = os.loadavg().map(n => n.toFixed(2)).join(' ');
    master.coresUsed = `${Object.keys(cluster.workers).length} of ${numCPUs}`;
    master.memoryUsageAtBoot = os.freemem();
    master.totalMem = os.totalmem();
    master.currentMemoryUsage = (os.totalmem() - os.freemem());
    master.hostCpu = ((_.reduce(os.cpus(), (memo, cpu) => memo + (cpu.times.user /
                        (cpu.times.user + cpu.times.nice +
                            cpu.times.sys + cpu.times.idle + cpu.times.irq)), 0) * 100) / numCPUs).toFixed(2);
    master.workers = _.map(cluster.workers, (worker, id) => (
      {isDead: worker.isDead(),
        isConnected: worker.isConnected(),
        pid: worker.process.pid,
        id: id}));
    return {master};
  };

  const statusHandler = function (data) {
    eventBus.emit(data.id, getStats());
  };

  const msgHandlers = {
    log: logHandler,
    event: eventHandler
  };

  eventBus.on('masterStatus', statusHandler);

  eventBus.on('*', (event, data) => {
    logger.debug(`Master: eventBus(${event}, ${JSON.stringify(data)})`);
  });

  // fork one worker and return Promise which resolves when its Indicate
  // that it is ready for listening sockets.
  const fork = () => new Promise((resolve, reject) => {
    const worker = cluster.fork();
    const onExit = (code, signal) => {
      if (signal) {
        logger.warn(`worker was killed by signal: ${signal}`);
      } else if (code !== 0) {
        logger.warn(`worker exited with error code: ${code}`);
      } else {
        logger.info('worker success!');
      }
      worker.removeAllListeners();
      reject();
    };
    const onMessage = (data) => {
      const type = _.get(data, 'type');
      if (type === 'listening') {
        worker.removeListener('exit', onExit);
        resolve();
      } else if (_.has(msgHandlers, type)) {
        msgHandlers[type].call(worker, data);
      } else {
        logger.warn(`Unknown message type "${type}" from worker`);
      }
    };
    worker.on('message', onMessage);
    worker.once('exit', onExit);
  });

  // Fork workers series..
  Promise
    .all(_.times(numCPUs, fork))
    .then(() => {
      logger.info('All workers is ready to serve.');
    });

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

  // Reload single worker and return Promise.
  // Promise resolves when worker is listening socket.
  const reloadWorker = (worker) => {
    logger.info(`Reload worker#${worker.id}`);
    return new Promise((resolve, reject) => {
      worker.once('exit', () => {
        fork().then(resolve, reject);
      });
      worker.kill(); // @†odo this might need more robust solution
    });
  };
  // Reload all fork workers and return Promise
  const reloadAllWorkers = () => Promise
    .each(_.values(cluster.workers), reloadWorker)
    .then(() => {
      logger.info('All workers restarted.');
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

  // listen implementation file changes
  // when some change detected reload workers one by one
  // Provide zero server downtime.
  const listenChanges = () => {
    logger.info('Listen file changes, reload workers automatically if some change detected.');

    const masterFiles = [
      'app/master.js',
      'tools/logger',
      'tools/eventBus',
      'tools/cluster'];

    chokidar
      .watch('./app', {
        ignored: /(^|[/\\])\../,
        ignoreInitial: true
      })
      .on('all', (event, path) => {
        if (['change', 'add', 'remove'].indexOf(event) !== -1) {
          if (masterFiles.indexOf(path) !== -1) {
            logger.info(`Master file (${path}) changes - need restart whole server!`);
          } else {
            logger.info('File changes, need to reload workers..');
            reloadAllWorkers();
          }
        } else {
          logger.info(`Watch detected: ${event}: ${path}`);
        }
      });

    return Promise.resolve();
  };
  if (autoReload) {
    listenChanges();
  }
};
