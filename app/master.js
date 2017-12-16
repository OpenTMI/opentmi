// Native modules
const cluster = require('cluster');
const os = require('os');
const path = require('path');
const net = require('net');

// Third party modules
const _ = require('lodash');
const fileWatcher = require('chokidar');
const Promise = require('bluebird');
const farmhash = require('farmhash');

// Local modules
const logger = require('./tools/logger');
const eventBus = require('./tools/eventBus');
const config = require('../config');


// Module variables
const port = config.get('port');
const listen = config.get('listen');
const numCPUs = process.env.CI ? 2 : os.cpus().length;
const defaultAutoReload = config.get('auto-reload');

let systemRestartNeeded = false;
const memoryUsageAtBoot = os.freemem();

/**
 * Provides a static interface to worker management
 */
class Master {
  /**
   * Executes the main control flow of Master process,
   * forks number of workers and registers to different events.
   * @returns {Promise} promise to initialize and fork new workers
   */
  static initialize(autoReload = defaultAutoReload) {
    logger.info(`${process.pid} is running`);

    // Subscribe handlers for events
    eventBus.on('masterStatus', Master.statusHandler);
    eventBus.on('*', Master.broadcastHandler);
    eventBus.on('workerRestartNeeded', Master.handleWorkerRestart);
    eventBus.once('systemRestartNeeded', () => { systemRestartNeeded = true; });

    // Handle graceful exit
    process.on('SIGINT', Master.handleSIGINT);
    process.on('exit', Master.logMasterDeath);
    cluster.on('exit', Master.handleWorkerExit);

    // Start listening to changes in file system
    if (autoReload) {
      const watcher = Master.createFileListener('app');
      Master.activateFileListener(watcher);
    }

    // Fork workers
    logger.info(`Start forking ${numCPUs} workers..`);
    return Promise.each(_.times(numCPUs, String), Master.forkWorker)
      .then(() => { logger.info('All workers ready to serve.'); })
      .then(Master.listen)
      .then(() => { logger.info(`Master listening on port ${port}`); })
      .catch((error) => { logger.error(`System establish failed: ${error.message}`); });
  }

  static listen() {
    logger.debug(`Master start listening port ${port}`);
    // Create the outside facing server listening on our port.
    Master._server = net.createServer({pauseOnConnect: true});
    Master._server.on('connection', (socket) => {
      // We received a connection and need to pass it to the appropriate
      // worker. Get the worker for this connection's source IP and pass
      // it the connection.
      const index = Master.getWorkerIndex(socket.remoteAddress);
      const worker = _.get(Master.workers, index);
      if (worker) {
        if (worker.isConnected()) {
          worker.send('sticky-session:connection', socket);
        } else {
          socket.end();
          logger.warn('connection was dropped because worker was not valid anymore..');
        }
      } else {
        logger.warn(`Worker doesn't found with index ${index}`);
      }
    });

    let retryTimeout;
    Master._server.on('error', (e) => {
      logger.warn(`server error: ${e.message}`);
      if (e.code === 'EADDRINUSE') {
        logger.warn(`Port ${port} in use, retrying...`);
        retryTimeout = setTimeout(() => {
          Master._server.close();
          Master._server.listen(port, listen);
        }, 1000);
      }
    });
    const pending = new Promise((resolve) => {
      Master._server.once('listening', resolve);
    }).timeout(30000) // try 10 times to open port
      .catch(Promise.TimeoutError, (error) => {
        clearTimeout(retryTimeout);
        logger.warn('Listen timeouts - probably port was reserved already.');
        throw error;
      });
    Master._server.listen(port, listen);
    return pending;
  }
  /**
   * Informs the client that workers need to be restarted and restarts workers
   * @param {object} meta - meta data linked to this event
   * @param {string} reason - reason why restart is needed
   */
  static handleWorkerRestart(meta, reason) {
    if (reason) {
      logger.info(`Worker needs to restart, reason: ${reason}.`);
    } else {
      logger.info('Worker needs to restart, no reason provided.');
    }

    Master.reloadAllWorkers();
  }

  /**
   * Returns a packet of various data about cpu usage and worker processes
   * @return {Promise<object>} with master property that contains various machine data
   * @example
   * // example resolved object:
   * {
   *  master: {
   *    title: 'opentmi',
   *    requireRestart: false,
   *    pid: 1234,
   *    memoryUsage: {rss: 123, heapTotal: 123, heapUsed: 123},
   *    uptime: 100000, // [seconds]
   *    coresUsed: '1 of 4'
   *  },
   *  hostname: 'opentmi-host',
   *  os: 'linux',
   *  osStats: {
   *    uptime: 1000, // [seconds]
   *    averageLoad: [5, 4, 5], // 1, 5, and 15 minute load averages
   *    memoryUsageAtBoot: 1234, // [bytes]
   *    totalMem: 8000000, // [bytes]
   *    currentMemoryUsage: 12345, // [bytes]
   *    cpu: 12 // [%]
   *  },
   *  workers: [{
   *    starting: false,
   *    closing: false,
   *    isDead: false,
   *    isConnected: true,
   *    pid: 1235,
   *    id: 1
   *  }]
   */
  static getStats() {
    const stats = {};
    logger.silly('Collecting service stats..');
    // General information about master process
    stats.master = {
      title: process.title,
      requireRestart: systemRestartNeeded,
      pid: process.pid,
      memoryUsage: process.memoryUsage(),
      uptime: Math.floor(process.uptime()),
      coresUsed: `${Object.keys(cluster.workers).length} of ${numCPUs}`
    };

    // Machine resource stats
    stats.hostname = os.hostname();
    stats.os = `${os.type()} ${os.release()}`;
    stats.osStats = {
      uptime: Math.floor(os.uptime()),
      averageLoad: os.loadavg().map(n => n.toFixed(2)).join(' '),
      memoryUsageAtBoot,
      totalMem: os.totalmem(),
      currentMemoryUsage: (os.totalmem() - os.freemem())
    };
    // Calculates the fraction of time cpus spend on average in the user mode.
    function getUCTF(cpu) { // User Cpu Time Fraction
      return cpu.times.user / (cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq);
    }
    const avgCpuSum = (_.reduce(os.cpus(), (memo, cpu) => memo + getUCTF(cpu), 0) * 100) / numCPUs;
    stats.osStats.cpu = avgCpuSum.toFixed(2);

    // Collect information about workers
    const mapper = (worker, id) => {
      try {
        return {
          starting: worker.__starting,
          closing: worker.__closing,
          isDead: worker.isDead(),
          isConnected: worker.isConnected(),
          pid: worker.process.pid,
          id: id
        };
      } catch (error) {
        return {
          id: 'undefined',
          error
        };
      }
    };
    stats.workers = _.map(cluster.workers, mapper);
    return Promise.resolve(stats);
  }

  /**
   * Handles request event for master status
   * @param {object} data
   */
  static statusHandler(meta, data) {
    if (data.id) {
      Master.getStats().then((stats) => {
        eventBus.emit(data.id, stats);
      });
    } else {
      logger.warn('Cannot process masterStatus event that does not provide data with id property');
    }
  }

  /**
   * Logs broadcasted messages with debug visibility level
   * @param {string} eventName - name of the event that triggered
   * @param {object} meta - meta data included with the event, eg. origin worker id
   * @param {array} data - actual event data
   */
  static broadcastHandler(eventName, meta, ...data) {
    logger.debug(`[eventBus] ${eventName} | ${JSON.stringify(meta)} | ${JSON.stringify(data)}`);
  }

  /**
   * Fork one worker out of the master process.
   * @return {Promise} promise that resolves when worker reports that it is listening
   */
  static forkWorker() {
    return new Promise((resolve, reject) => {
      const worker = cluster.fork();
      Master.workers.push(worker);
      worker.__starting = true;
      worker.__closing = false;

      const onPrematureExit = (code, signal) => {
        Master.logWorkerDeath(worker, code, signal);
        worker.removeAllListeners();
        reject(new Error('Should not exit before listening event.'));
      };
      const onRemoveWorker = () => {
        _.remove(Master.workers, w => w === worker);
      };

      const onListening = () => {
        logger.info(`Worker#${worker.id} is accepting requests.`);
        worker.removeListener('exit', onPrematureExit);
        worker.__starting = false;
        resolve();
      };

      worker.on('listening', onListening);
      worker.on('message', Master.onWorkerMessage.bind(worker));
      worker.once('exit', onRemoveWorker);
      worker.once('exit', onPrematureExit);
    });
  }

  /**
   * Redirects data from worker to the proper handler, eq. log, event, ...
   * @param {*} data - data received from worker
   */
  static onWorkerMessage(data) {
    switch (data.type) {
      case 'log': {
        logger.handleWorkerLog(this, data);
        break;
      }
      case 'event': {
        eventBus.clusterEventHandler(this, data);
        break;
      }
      default: {
        logger.error(`Message without type from worker, data: ${JSON.stringify(data)}.`);
      }
    }
  }

  /**
   * Logs how and why master died.
   * @param {string} alias - alias for the process that died.
   * @param {number} code - the exit code, if it exited normally.
   * @param {string} signal - the name of the signal (e.g. 'SIGHUP') that caused the process to be killed.
   * @return {number} code representing ending, 0 for success, 1 for error code, 2 for signal.
   */
  static logMasterDeath(code, signal) {
    if (signal) {
      logger.warn(`Master process was killed by signal: ${signal}.`);
      return 2;
    } else if (code !== 0) {
      logger.warn(`Master process exited with error code: ${code}.`);
      return 1;
    }

    logger.info('Master process successfully ended!');
    return 0;
  }

  /**
   * Logs how and why worker died.
   * @param {number} code - the exit code, if it exited normally.
   * @param {string} signal - the name of the signal (e.g. 'SIGHUP') that caused the process to be killed.
   * @return {number} code representing ending, 0 for success, 1 for error code, 2 for signal.
   */
  static logWorkerDeath(worker, code, signal) {
    if (signal) {
      logger.warn(`Worker#${worker.id} process was killed by signal: ${signal}.`);
      return 2;
    } else if (code !== 0) {
      logger.warn(`Worker#${worker.id} process exited with error code: ${code}.`);
      return 1;
    }

    logger.info(`Worker#${worker.id} process successfully ended!`);
    return 0;
  }

  static close() {
    if (Master._server) {
      Master._server.close();
    }
    return Promise.resolve();
  }

  /**
   * Kills workers and exits process.
   * @return {Promise} promise to kill all workers
   */
  static handleSIGINT() {
    // @todo SIGINT automatically gets sent to all workers, worker killing might produce weird reslts
    logger.info('SIGINT received.');

    // @todo handle killing more gracefully, atm cluster already forwards sigint to workers as soon as it receives it
    // This means that master tries to send signals to already interrupted workers which throw EPIPE errors, because
    // the workers already stopped receiving signals.
    return Master.killAllWorkers()
      .then(Master.close)
      .then(() => {
        logger.info('All workers killed, exiting process.');
        process.exit();
      });
  }

  /**
   * Handler for worker  how worker died.
   * @param {object} worker - worker instance defined by cluster module.
   * @param {number} code - the exit code, if it exited normally.
   * @param {string} signal - the name of the signal (e.g. 'SIGHUP') that caused the process to be killed.
   */
  static handleWorkerExit(worker, code, signal) {
    if (signal) {
      logger.warn(`Worker#${worker.id} died with signal: ${signal}.`);
    } else {
      logger.warn(`Worker#${worker.id} died.`);
    }

    if (!worker) {
      logger.error('Undefined worker received.');
    } else if (worker.exitedAfterDisconnect === false) { // Start a replacement worker if needed
      logger.info('Replacing worker...');
      Master.forkWorker();
    }
  }

  static getWorkerIndex(ip) {
    return farmhash.fingerprint32(ip) % Master.workers.length; // Farmhash is the fastest and works with IPv6, too
  }

  /**
   * Kill single worker, resolves when the worker is dead.
   * @param {object} worker - worker instance defined by cluster module.
   * @return {Promise} promise to kill a worker.
   */
  static killWorker(worker) {
    logger.debug(`Killing Worker#${worker.id}.`);
    worker.__closing = true; // eslint-disable-line no-param-reassign
    const tryTerminate = signal => new Promise((resolve, reject) => {
      worker.once('exit', resolve);
      logger.silly(`Killing worker#${worker.id} with ${signal}`);
      try {
        worker.kill(signal);
      } catch (error) {
        reject(error);
      }
    });

    return tryTerminate('SIGINT').timeout(Master.SIGINT_TIMEOUT)
      .catch(Promise.TimeoutError, () => {
        logger.warn(`Can't kill worker#${worker.id} kindly`);
        return tryTerminate('SIGTERM').timeout(Master.GIGTERM_TIMEOUT);
      })
      .catch(Promise.TimeoutError, () => {
        logger.warn(`Can't kill worker#${worker.id} less kindly`);
        return tryTerminate('SIGKILL').timeout(Master.SIGKILL_TIMEOUT);
      })
      .catch(Promise.TimeoutError, (error) => {
        logger.error(`Failed to kill Worker#${worker.id}: ${error.message}`);
        throw error;
      })
      .catch((error) => {
        logger.warn(`kill throws error: ${error.message}`);
        throw error;
      });
  }

  /**
   * Kills all workers in cluster.
   * @return {Promise} promise to kill all workers.
   */
  static killAllWorkers() {
    logger.info('Killing all workers...');
    return Promise.all(_.map(cluster.workers, Master.killWorker))
      .then(() => { logger.info('All workers killed.'); })
      .catch((error) => { logger.error(error); });
  }

  /**
   * Reload single worker, resolves when worker is listening socket.
   * @param {object} worker - worker instance defined by cluster module.
   * @return {Promise} promise to kill a worker and start a new one.
   */
  static reloadWorker(worker) {
    logger.info(`Reloading Worker#${worker.id}.`);
    return Master.killWorker(worker)
      .then(() => Master.forkWorker());
  }

  /**
   * Reload all fork workers and return Promise.
   * @return {Promise} promise to reload all workers.
   */
  static reloadAllWorkers() {
    logger.info('Restarting all workers...');
    return Promise.each(_.values(cluster.workers), Master.reloadWorker)
      .then(() => { logger.info('All workers restarted.'); });
  }

  /**
   * Returns a file event watcher for a specific directory.
   * @param {string} dir - relative directory from workspace that you want to listen.
   * @return {Emitter} watcher for file events.
   */
  static createFileListener(dir = '.') {
    logger.info(`Creating watcher for directory: ${dir}.`);

    // @note Listeners are created recursively, check amount of created listeners before commiting
    const options = {
      ignored: /(^|[/\\])\.|node_modules/,
      ignoreInitial: true
    };

    const watcher = fileWatcher.watch(dir, options);
    watcher.on('ready', () => {
      logger.debug(`File watcher ready, watchers included: ${Object.keys(watcher.getWatched()).length}`);
    });

    watcher.on('error', (error) => {
      logger.error(`Chokidar reported an error: ${error.message}`);
      logger.debug(error.stack);
    });

    return watcher;
  }

  /**
   * Start reacting to file changes in the app directory.
   * Reloads all workers if changes are detected, which in turn
   * allows for zero server downtime updates.
   * @param {Emitter} watcher - emitter that reports file events.
   */
  static activateFileListener(watcher) {
    logger.info('Activating file listener, reloading workers automatically if changes detected.');

    const masterFiles = [
      path.join('app', 'master.js'),
      path.join('tools', 'logger'),
      path.join('tools', 'eventBus'),
      path.join('tools', 'cluster')
    ];

    const listenedEvents = [
      'change',
      'add',
      'remove',
      'unlinkDir',
      'addDir'
    ];

    watcher.on('all', (event, filePath) => {
      if (listenedEvents.indexOf(event) === -1) {
        logger.debug(`File event detected ${event}: ${filePath}`);
      } else if (masterFiles.indexOf(filePath) === -1) {
        logger.info('File changed, need to reload workers...');
        eventBus.emit('workerRestartNeeded', `file changed: ${filePath}`);
      } else {
        logger.info(`Internal files (${filePath}) changed, the whole server needs to reset!`);
        eventBus.emit('systemRestartNeeded', `file changed: ${filePath}`);
      }
    });
  }

  /**
   * Stops file listening functionality
   * @param {Emitter} watcher - emitter that reports file events
   */
  static deactivateFileListener(watcher) {
    logger.info('Deactivating file listener, no longer reacting to file changes.');
    watcher.close();
  }
}

Master.SIGINT_TIMEOUT = 3000;
Master.GIGTERM_TIMEOUT = 2000;
Master.SIGKILL_TIMEOUT = 1000;

Master.workers = [];
Master._server = undefined;

module.exports = Master;
