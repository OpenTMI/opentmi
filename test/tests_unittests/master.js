/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Native components
const path = require('path');
const cluster = require('cluster');
const os = require('os');
const EventEmitter = require('events');

// Third party components
require('colors');
const chai = require('chai');

// Local components
const eventBus = require('../../app/tools/eventBus');
const logger = require('../../app/tools/logger');

// Test config
cluster.fork = () => {};
logger.level = 'silent';

// Test variables
const expect = chai.expect;
const filePath = path.resolve('app');
let Master;

describe('app/master.js', function () {
  const originalLogWarn = logger.warn;
  const originalLogInfo = logger.info;
  const originalLogDebug = logger.debug;

  beforeEach(function (done) {
    delete require.cache[path.join(filePath, 'Master.js')];
    Master = require('../../app/Master'); // eslint-disable-line

    eventBus.removeAllListeners();
    process.removeAllListeners();
    cluster.removeAllListeners();

    // Restore function that might have been mocked
    logger.warn = originalLogWarn;
    logger.info = originalLogInfo;
    logger.debug = originalLogDebug;

    done();
  });


  describe('initialize', function () {
    beforeEach(function (done) {
      Master.forkWorker = () => {};

      Master.createFileListener = () => {};
      Master.activateFileListener = () => {};
      done();
    });

    it('should listen for process and cluster events', function (done) {
      let sigintCalled = false;
      let exitCalled = false;

      Master.handleSIGINT = () => {
        sigintCalled = true;
        process.emit('exit');
      };
      Master.logMasterDeath = () => {
        expect(sigintCalled).to.equal(true, 'handleSIGINT should be called before logMasterDeath.');
        exitCalled = true;
        cluster.emit('exit');
      };
      Master.handleWorkerExit = () => {
        expect(sigintCalled).to.equal(true, 'handleSIGINT should be called before handleWorkerExit.');
        expect(exitCalled).to.equal(true, 'logMasterDeath should be called before handleWorkerExit.');
        done();
      };

      Master.initialize().catch(done);
      process.emit('SIGINT');
    });

    it('should listen for eventBus events', function (done) {
      Master.statusHandler = (meta, data) => {
        expect(data).to.deep.equal({id: 'testId', data: 'testData'});
        done();
      };

      Master.broadcastHandler = (event, meta, data) => {
        expect(event).to.equal('testEvent');
        expect(data).to.equal('testData');

        eventBus.removeListener('*', Master.broadcastHandler);
        eventBus.emit('masterStatus', {id: 'testId', data: 'testData'});
      };

      Master.initialize().catch(done);
      eventBus.emit('testEvent', 'testData');
    });

    it('should call listenChanges by default', function (done) {
      let createCalled = false;
      Master.createFileListener = () => {
        createCalled = true;
        return 'mockFileWatcher';
      };

      Master.activateFileListener = (watcher) => {
        expect(watcher).to.equal('mockFileWatcher');
        expect(createCalled).to.equal(true, 'should call createFileListener before listener activation');
        done();
      };

      Master.initialize();
    });

    it('should call fork os.cpus().length times', function (done) {
      const cpus = os.cpus().length;

      // Overwrite fork so we do not actually fork a child process
      let forkCalled = 0;
      Master.forkWorker = () => {
        forkCalled += 1;
      };

      Master.initialize().then(() => {
        expect(forkCalled).to.equal(cpus, 'Should fork worker for each cpu core.');
        done();
      }).catch(done);
    });
  });

  describe('getStats', function () {
    it('should return object with valid fields', function (done) {
      const stats = Master.getStats();

      expect(stats).to.have.property('master');
      const masterStats = stats.master;

      expect(masterStats).to.have.property('hostname');
      expect(masterStats).to.have.property('os');
      expect(masterStats).to.have.property('averageLoad');
      expect(masterStats).to.have.property('coresUsed');
      expect(masterStats).to.have.property('memoryUsageAtBoot');
      expect(masterStats).to.have.property('totalMem');
      expect(masterStats).to.have.property('currentMemoryUsage');
      expect(masterStats).to.have.property('hostCpu');
      expect(masterStats).to.have.property('workers');

      done();
    });
  });

  describe('statusHandler', function () {
    it('should emit event (data.id) with (Master.getStats()) data', function (done) {
      Master.getStats = () => 'handler_testData';

      eventBus.on('handler_testEvent', (meta, data) => {
        expect(data).to.equal('handler_testData');
        done();
      });

      Master.statusHandler({}, {id: 'handler_testEvent'});
    });

    it('should not throw error when no id defined', function (done) {
      Master.statusHandler({}, 5);
      done();
    });
  });

  describe('broadcastHandler', function () {
    it('should not throw errors with valid params', function (done) {
      Master.broadcastHandler('name', {field1: 'sop', field2: 'sep'}, ['data', 'pata']);
      done();
    });
  });

  describe('forkWorker', function () {
    let forkCalled = false;
    const forkEmitter = new EventEmitter();

    before(function () {
      forkCalled = true;
      cluster.fork = () => {
        forkCalled = true;
        return forkEmitter;
      };
    });

    beforeEach(function (done) {
      forkEmitter.removeAllListeners();
      done();
    });

    it('should call fork', function () {
      const forkPromise = Master.forkWorker().then(() => {
        expect(forkCalled).to.equal(true);
        expect(forkEmitter.listenerCount('exit')).to.equal(0, 'Should remove exit event listener before rejecting.');
        expect(forkEmitter.listenerCount('listening')).to.equal(1, 'Should still listen to listening events');
        expect(forkEmitter.listenerCount('message')).to.equal(1, 'Should listen to message events');
      });

      forkEmitter.emit('listening');
      return forkPromise;
    });

    it('should reject promise on early exit', function () {
      const forkPromise = Master.forkWorker()
        .then(() => Promise.reject('Should not resolve if process exits too early.'))
        .catch((error) => {
          expect(error).to.be.instanceOf(Error);
          expect(error).to.have.property('message', 'Should not exit before listening event.');
          expect(forkEmitter.listenerCount('listening')).to.equal(0, 'Should remove listening event listeners.');
          expect(forkEmitter.listenerCount('message')).to.equal(0, 'Should remove message event listeners.');
          expect(forkEmitter.listenerCount('exit')).to.equal(0, 'Should remove exit event listeners.');
        });

      forkEmitter.emit('exit');
      return forkPromise;
    });

    it('should pass log messages to logger.handleWorkerLog', function (done) {
      logger.warn = (message) => {
        done(new Error(`Should not trigger a warning, message: ${message}`));
      };

      logger.handleWorkerLog = (worker, data) => {
        expect(data).to.have.property('type', 'log');
        expect(data).to.have.property('level', 'tesbug');
        expect(data).to.have.deep.property('args', ['arg1', 'arg2', 'arg3']);
        done();
      };

      Master.forkWorker().then(() => {
        forkEmitter.emit('message', {type: 'log', level: 'tesbug', args: ['arg1', 'arg2', 'arg3']});
      });
      forkEmitter.emit('listening');
    });

    it('should pass event messages to eventBus clusterEventHandler', function (done) {
      logger.warn = (message) => {
        done(new Error(`Should not trigger a warning, message: ${message}`));
      };

      eventBus.clusterEventHandler = (data) => {
        expect(data).to.have.property('type', 'event');
        expect(data).to.have.property('data', 'fork_TestData');
        done();
      };

      Master.forkWorker().then(() => {
        forkEmitter.emit('message', {type: 'event', data: 'fork_TestData'});
      });
      forkEmitter.emit('listening');
    });

    it('missing message type should trigger a warning', function (done) {
      logger.warn = (message) => {
        expect(message).to.equal('Message without type from worker, data: "fork_TestData".');
        done();
      };

      eventBus.clusterEventHandler = () => {
        done(new Error('Typeless event should not be forwarded to clusterEventHandler'));
      };

      logger.handleWorkerLog = () => {
        done(new Error('Typeless event should not be forwarded to handleWorkerLog'));
      };

      Master.forkWorker().then(() => {
        forkEmitter.emit('message', 'fork_TestData');
      });
      forkEmitter.emit('listening');
    });

    it('unknown message type should trigger a warning', function (done) {
      logger.warn = (message) => {
        expect(message).to.equal(
          'Unknown message type "Desbug" from worker, data: {"type":"Desbug","data":"fork_TestData"}.');
        done();
      };

      eventBus.clusterEventHandler = () => {
        done(new Error('Unknown message should not be forwarded to clusterEventHandler'));
      };

      logger.handleWorkerLog = () => {
        done(new Error('Unknown message should not be forwarded to handleWorkerLog'));
      };

      Master.forkWorker().then(() => {
        forkEmitter.emit('message', {type: 'Desbug', data: 'fork_TestData'});
      });
      forkEmitter.emit('listening');
    });
  });

  describe('logMasterDeath', function () {
    it('should trigger warning with signal', function (done) {
      logger.warn = (message) => {
        expect(message).to.equal('process was killed by signal: SAIGNAL.');
        done();
      };

      Master.logMasterDeath(undefined, 'SAIGNAL');
    });

    it('should trigger warning with code and no signal', function (done) {
      logger.warn = (message) => {
        expect(message).to.equal('process exited with error code: 1235.');
        done();
      };

      Master.logMasterDeath(1235, undefined);
    });

    it('should trigger info if received code is 0', function (done) {
      logger.info = (message) => {
        expect(message).to.equal('process successfully ended!');
        done();
      };

      Master.logMasterDeath(0, undefined);
    });
  });

  describe('logWorkerDeath', function () {
    it('should trigger warning with signal', function (done) {
      logger.warn = (message) => {
        expect(message).to.equal('Worker ID1 process was killed by signal: SAIGNAL.');
        done();
      };

      Master.logWorkerDeath({id: 'ID1'}, undefined, 'SAIGNAL');
    });

    it('should trigger warning with code and no signal', function (done) {
      logger.warn = (message) => {
        expect(message).to.equal('Worker ID2 process exited with error code: 1235.');
        done();
      };

      Master.logWorkerDeath({id: 'ID2'}, 1235, undefined);
    });

    it('should trigger info if received code is 0', function (done) {
      logger.info = (message) => {
        expect(message).to.equal('Worker ID3 process successfully ended!');
        done();
      };

      Master.logWorkerDeath({id: 'ID3'}, 0, undefined);
    });
  });

  describe('handleSIGINT', function () {
    it('should kill all workers', function () {
      const processExitFunction = process.exit;

      let processExitCalled = false;
      process.exit = () => {
        processExitCalled = true;
      };

      const worker1 = new EventEmitter();
      const worker2 = new EventEmitter();
      const worker3 = new EventEmitter();

      let killCalled1 = false;
      worker1.kill = () => {
        killCalled1 = true;
        worker1.emit('exit');
      };

      let killCalled2 = false;
      worker2.kill = () => {
        killCalled2 = true;
        worker2.emit('exit');
      };

      let killCalled3 = false;
      worker3.kill = () => {
        killCalled3 = true;
        worker3.emit('exit');
      };

      cluster.workers = [worker1, worker2, worker3];
      return Master.handleSIGINT().then(() => {
        process.exit = processExitFunction;
        expect(killCalled1 && killCalled2 && killCalled3).to.equal(true,
          'Kill function should be called for all workers.');
        expect(processExitCalled).to.equal(true,
          'Should call process.exit at some point.');
      }).catch((error) => {
        process.exit = processExitFunction;
        throw error;
      });
    });
  });

  describe('handleWorkerExit', function () {
    it('should fork new worker when exit was not voluntary', function (done) {
      const worker = {
        process: {pid: 'PID'},
        exitedAfterDisconnect: false
      };

      Master.forkWorker = () => {
        done();
      };

      Master.handleWorkerExit(worker, 1, undefined);
    });

    it('should not fork new worker when exit is voluntary', function (done) {
      const worker = {
        process: {pid: 'PID'},
        exitedAfterDisconnect: true
      };

      Master.forkWorker = () => {
        done(new Error('Fork is not supposed to be called when exiting voluntarily.'));
      };

      Master.handleWorkerExit(worker, 1, 'SIGMOCK');
      done();
    });
  });

  describe('reloadWorker', function () {
    it('should kill worker and fork a new one', function () {
      Master.forkWorker = () => Promise.resolve();

      const worker = new EventEmitter();

      let killCalled = false;
      worker.kill = (signal) => {
        expect(signal).to.equal('SIGINT');

        killCalled = true;
        worker.emit('exit');
      };

      const reloadPromise = Master.reloadWorker(worker)
        .then(() => { expect(killCalled).to.equal(true); });

      return reloadPromise;
    });
  });

  describe('reloadAllWorkers', function () {
    it('should call reload for all workers defined in the cluster.', function () {
      const workers = ['worker1', 'worker2', 'worker3'];

      let reloadCalled = 0;
      Master.reloadWorker = (worker) => {
        expect(worker).to.equal(workers[reloadCalled]);
        reloadCalled += 1;
        return Promise.resolve;
      };

      cluster.workers = workers;

      const reloadPromise = Master.reloadAllWorkers()
        .then(() => {
          expect(reloadCalled).to.equal(3);
        });
      return reloadPromise;
    });
  });

  describe('createFileListener', function () {
    it('should return an object that provides emitter functionality', function (done) {
      const watcher = Master.createFileListener();
      expect(watcher).to.have.property('emit');
      expect(watcher).to.have.property('on');
      done();
    });
  });

  describe('activateFileListener', function () {
    it('should ignore changes to master file', function (done) {
      Master.reloadAllWorkers = () => {
        done(new Error('Should not reload workers when a master file is edited.'));
      };

      const watcher = new EventEmitter();
      Master.activateFileListener(watcher);

      // Initial logs have already passed at this point, we want to capture the last one
      logger.info = (message) => {
        expect(message).to.equal('Internal files (master.js) changed, the whole server needs to reset!');
        done();
      };

      // Emit a change event
      watcher.emit('all', 'change', 'master.js');
    });

    it('should reload all watchers when a worker file is edited', function (done) {
      Master.reloadAllWorkers = () => {
        done();
      };

      const watcher = new EventEmitter();
      Master.activateFileListener(watcher);

      // Initial logs have already passed at this point, we want to capture the last one
      logger.info = (message) => {
        expect(message).to.equal('File changed, need to reload workers...');
      };

      // Emit a change event
      watcher.emit('all', 'change', 'random-file.js');
    });

    it('should log unlistened events to debug channel', function (done) {
      Master.reloadAllWorkers = () => {
        done(new Error('Should not reload workers when an uninteresting file event happens.'));
      };

      const watcher = new EventEmitter();
      Master.activateFileListener(watcher);

      // Initial logs have already passed at this point, we want to capture the last one
      logger.debug = (message) => {
        expect(message).to.equal('File watch detected: chuaange: random-file.js');
        done();
      };

      // Emit a change event
      watcher.emit('all', 'chuaange', 'random-file.js');
    });
  });

  describe('deactivateFileListener', function () {
    it('should call removeAllListeners', function (done) {
      const watcher = {
        removeAllListeners: done
      };

      Master.deactivateFileListener(watcher);
    });
  });
});
