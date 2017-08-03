const cluster = require('cluster');
const os = require('os');

const numCPUs = os.cpus().length;
const _ = require('lodash');
const chokidar = require('chokidar');
const Promise = require('bluebird');

const logger = require('./tools/logger');
const eventBus = require('./tools/eventBus');

const autoReload = true; // @todo get from config file


function logHandler(data) {
  const level = _.get(data, 'level', 'debug');
  const args = _.get(data, 'args', []);
  args.unshift(`Worker#${this.id}`);
  try {
    logger[level](...args);
  }
  catch (error) {
    logger.error(data);
    logger.error(error);
  }
}

module.exports = function Master() {
  logger.level = 'debug';
  logger.info(`Master ${process.pid} is running`);

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
    event: eventBus.clusterEventHandler
  };

  eventBus.on('masterStatus', statusHandler);
  eventBus.on('*', (eventName, meta, data) => {
    logger.debug(`Master: [eventBus] ${eventName}(${JSON.stringify(meta)}): ${JSON.stringify(data)})`);
  });

  // fork one worker and return Promise which resolves when its Indicated
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
      reject(new Error('Should not exit before listening event'));
    };
    const onMessage = (data) => {
      const dataType = _.get(data, 'type');
      if (_.has(msgHandlers, dataType)) {
        msgHandlers[dataType].call(worker, data);
      } else {
        logger.warn(`Unknown message type "${dataType}" from worker`);
      }
    };

    eventBus.on('start_listening', (meta) => {
      if (meta.id === worker.id) {
        logger.info(`Worker#${worker.id} is accepting requests.`);
        worker.removeListener('exit', onExit);
        resolve();
      }
    });

    worker.on('message', onMessage);
    worker.once('exit', onExit);
  });

  // Fork workers series..
  Promise
    .all(_.times(numCPUs, fork))
    .then(() => {
      logger.info('All workers ready to serve.');
    });

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died ${signal ? `by signal: ${signal}` : ''}.`);
    if (worker.exitedAfterDisconnect === false) {
      logger.info('Restarting worker.');
      fork();
    } else {
      logger.info('Worker was not supposed to restart.');
    }
  });

  // Reload single worker and return Promise.
  // Promise resolves when worker is listening socket.
  const reloadWorker = (worker) => {
    logger.info(`Reloading worker#${worker.id}.`);
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
