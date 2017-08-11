// Native modules
const cluster = require('cluster');
const os = require('os');

// Third party modules
const _ = require('lodash');
const fileWatcher = require('chokidar');
const Promise = require('bluebird');

// Local modules
const logger = require('./tools/logger');
const eventBus = require('./tools/eventBus');

// Module variables
const numCPUs = os.cpus().length;
const autoReload = true; // @todo get from config file

/**
 * Provides a static interface to worker management
 */
class Master {
  /**
   * Executes the main control flow of Master process,
   * forks number of workers and registers to different events.
   */
  static initialize() {
    logger.info(`${process.pid} is running`);

    // Subscribe handlers for events
    eventBus.on('masterStatus', Master.statusHandler);
    eventBus.on('*', Master.broadcastHandler);

    // Handle graceful exit
    process.on('SIGINT', Master.handleSIGINT);
    process.on('exit', Master.logMasterDeath);
    cluster.on('exit', Master.handleWorkerExit);

    // Start listening to changes in file system
    if (autoReload) {
      const watcher = Master.createFileListener('app');
      Master.activateFileListener(watcher);
    }

    // Fork workers...
    return Promise.each(_.times(numCPUs, String), Master.forkWorker)
      .then(() => { logger.info('All workers ready to serve.'); });
  }

  /**
   * Returns a packet of various data about cpu usage and worker processes
   */
  static getStats() {
    const master = {};
    master.hostname = os.hostname();
    master.os = `${os.type()} ${os.release()}`;
    master.averageLoad = os.loadavg().map(n => n.toFixed(2)).join(' ');
    master.coresUsed = `${Object.keys(cluster.workers).length} of ${numCPUs}`;
    master.memoryUsageAtBoot = os.freemem();
    master.totalMem = os.totalmem();
    master.currentMemoryUsage = (os.totalmem() - os.freemem());

    // Calculates the fraction of time cpus spend on average in the user mode.
    function getUCTF(cpu) { // User Cpu Time Fraction
      return cpu.times.user / (cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq);
    }
    const avgCpuSum = (_.reduce(os.cpus(), (memo, cpu) => memo + getUCTF(cpu), 0) * 100) / numCPUs;
    master.hostCpu = avgCpuSum.toFixed(2);

    // Collect information about workers
    master.workers = _.map(cluster.workers, (worker, id) => (
      {isDead: worker.isDead(),
        isConnected: worker.isConnected(),
        pid: worker.process.pid,
        id: id}));
    return {master: master};
  }

  /**
   * Handles request event for master status
   * @param {object} data
   */
  static statusHandler(meta, data) {
    if (!data.id) {
      logger.warn('Cannot process masterStatus event that does not provide data with id property');
    } else {
      eventBus.emit(data.id, Master.getStats());
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

      const onPrematureExit = (code, signal) => {
        Master.logWorkerDeath(worker, code, signal);

        worker.removeAllListeners();
        reject(new Error('Should not exit before listening event.'));
      };

      const onListening = () => {
        logger.info(`Worker#${worker.id} is accepting requests.`);
        worker.removeListener('exit', onPrematureExit);
        resolve();
      };

      const msgHandlers = {
        log: logger.handleWorkerLog.bind(logger, worker),
        event: eventBus.clusterEventHandler,
        default: (data) => {
          logger.warn(`Message without type from worker, data: ${JSON.stringify(data)}.`);
        }
      };

      const onMessage = (data) => {
        const dataType = _.get(data, 'type', 'default');
        if (_.has(msgHandlers, dataType)) {
          msgHandlers[dataType].call(worker, data);
        } else {
          logger.warn(`Unknown message type "${dataType}" from worker, data: ${JSON.stringify(data)}.`);
        }
      };

      worker.on('listening', onListening);
      worker.on('message', onMessage);
      worker.once('exit', onPrematureExit);
    });
  }

  /**
   * Logs how and why master died
   * @param {string} alias - alias for the process that died
   * @param {number} code - the exit code, if it exited normally.
   * @param {string} signal - the name of the signal (e.g. 'SIGHUP') that caused the process to be killed.
   */
  static logMasterDeath(code, signal) {
    if (signal) {
      logger.warn(`process was killed by signal: ${signal}.`);
    } else if (code !== 0) {
      logger.warn(`process exited with error code: ${code}.`);
    } else {
      logger.info('process successfully ended!');
    }
  }

  /**
   * Logs how and why worker died
   * @param {number} code - the exit code, if it exited normally.
   * @param {string} signal - the name of the signal (e.g. 'SIGHUP') that caused the process to be killed.
   */
  static logWorkerDeath(worker, code, signal) {
    if (signal) {
      logger.warn(`Worker ${worker.id} process was killed by signal: ${signal}.`);
    } else if (code !== 0) {
      logger.warn(`Worker ${worker.id} process exited with error code: ${code}.`);
    } else {
      logger.info(`Worker ${worker.id} process successfully ended!`);
    }
  }

  /**
   * Defines how master should react to SIGINT signal
   */
  static handleSIGINT() {
    logger.info('SIGINT received, killing workers first...');
    const promiseKill = worker => new Promise((resolve) => {
      worker.once('exit', resolve);
      worker.kill('SIGINT');
    });
    const pending = _.map(cluster.workers, worker => promiseKill(worker));
    return Promise.all(pending).then(() => {
      logger.info('All workers killed, exiting process.');
      process.exit();
    });
  }

  /**
   * Handler for worker  how worker died
   * @param {object} worker - worker instance defined by cluster module
   * @param {number} code - the exit code, if it exited normally.
   * @param {string} signal - the name of the signal (e.g. 'SIGHUP') that caused the process to be killed.
   */
  static handleWorkerExit(worker, code, signal) {
    if (signal) {
      logger.warn(`Worker ${worker.process.pid} died with signal: ${signal}.`);
    } else {
      logger.warn(`Worker ${worker.process.pid} died.`);
    }

    // Start a replacement worker if needed
    if (worker.exitedAfterDisconnect === false) {
      logger.info('Replacing worker...');
      Master.forkWorker();
    }
  }

  /**
   * Reload single worker, resolves when worker is listening socket.
   * @param {object} worker - worker instance defined by cluster module
   * @return {Promise} promise to kill a worker and start a new one
   */
  static reloadWorker(worker) {
    logger.info(`Reloading Worker#${worker.id}.`);
    return new Promise((resolve, reject) => {
      worker.once('exit', () => {
        Master.forkWorker().then(resolve, reject);
      });
      worker.kill('SIGINT'); // @†odo this might need more robust solution, finish requests before dying
    });
  }

  /** 
   * Reload all fork workers and return Promise.
   * @return {Promise} promise to reload all workers
   */
  static reloadAllWorkers() {
    logger.info('Restarting all workers...');
    return Promise.each(_.values(cluster.workers), Master.reloadWorker)
      .then(() => { logger.info('All workers restarted.'); });
  }

  /**
   * Returns a file event watcher for a specific directory
   * @param {string} dir - relative directory from workspace that you want to listen
   * @return {Emitter} watcher for file events
   */
  static createFileListener(dir = '.') {
    const options = {
      ignored: /(^|[/\\])\../,
      ignoreInitial: true
    };

    return fileWatcher.watch(dir, options);
  }

  /** 
   * Start reacting to file changes in the app directory.
   * Reloads all workers if changes are detected, which in turn
   * allows for zero server downtime updates.
   * @param {Emitter} watcher - emitter that reports file events
   */
  static activateFileListener(watcher) {
    logger.info('Listening to file changes, reloading workers automatically if changes detected.');

    const masterFiles = [
      'master.js',
      'tools/logger',
      'tools/eventBus',
      'tools/cluster'
    ];

    const listenedEvents = [
      'change',
      'add',
      'remove',
      'unlinkDir',
      'addDir'
    ];

    watcher.on('all', (event, path) => {
      if (listenedEvents.indexOf(event) === -1) {
        logger.debug(`File watch detected: ${event}: ${path}`);
      } else if (masterFiles.indexOf(path) === -1) {
        logger.info('File changed, need to reload workers...');
        Master.reloadAllWorkers();
      } else {
        logger.info(`Internal files (${path}) changed, the whole server needs to reset!`);
      }
    });
  }

  /**
   * Stops file listening functionality
   * @param {Emitter} watcher - emitter that reports file events
   */
  static deactivateFileListener(watcher) {
    logger.info('Removing all file listeners, no longer reacting to file changes.');
    watcher.removeAllListeners();
  }
}

module.exports = Master;