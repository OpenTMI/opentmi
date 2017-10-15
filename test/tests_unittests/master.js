/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Native components
const path = require('path');
const cluster = require('cluster');
const os = require('os');
const EventEmitter = require('events');

// Third party components
require('colors');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Local components
const eventBus = require('../../app/tools/eventBus');
const logger = require('../../app/tools/logger');

// Test config
cluster.fork = () => {}; // Do not allow forking while testing, will cause all manner of trouble
logger.level = 'silent';
chai.use(chaiAsPromised);

// Test variables
const expect = chai.expect;
const filePath = path.resolve('app');
let Master;

describe('app/master.js', function () {
  beforeEach(function () {
    delete require.cache[path.join(filePath, 'master.js')];
    Master = require('../../app/master'); // eslint-disable-line

    eventBus.removeAllListeners();
    process.removeAllListeners();
    cluster.removeAllListeners();
  });

  after(function () {
    const modulePath = path.join(filePath, 'tools', 'eventBus', 'index.js');
    delete require.cache[modulePath];
  });

  describe('initialize', function () {
    beforeEach(function () {
      Master.forkWorker = () => {};

      Master.createFileListener = () => {};
      Master.activateFileListener = () => {};
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
      Master.broadcastHandler = (event, meta, data) => {
        expect(event).to.equal('testEvent');
        expect(data).to.equal('testData');

        eventBus.removeListener('*', Master.broadcastHandler);
        eventBus.emit('masterStatus', {id: 'testId', data: 'testData'});
      };

      Master.statusHandler = (meta, data) => {
        expect(data).to.deep.equal({id: 'testId', data: 'testData'});
        eventBus.emit('workerRestartNeeded', 'reasons');
      };

      Master.handleWorkerRestart = (meta, reason) => {
        expect(reason).to.equal('reasons');
        done();
      };

      Master.initialize().catch(done);
      eventBus.emit('testEvent', 'testData');
    });

    it('should call createFileListener and activateFileListener when auto-reload is true', function (done) {
      let createCalled = false;
      Master.createFileListener = () => {
        createCalled = true;
        return 'mockFileWatcher';
      };

      let activateCalled = false;
      Master.activateFileListener = (watcher) => {
        expect(watcher).to.equal('mockFileWatcher');
        expect(createCalled).to.equal(true, 'should call createFileListener before listener activation');
        activateCalled = true;
      };

      Master.initialize(true);

      expect(createCalled).to.equal(true, 'listener should be created when auto-reload is true');
      expect(activateCalled).to.equal(true, 'listener should be activated when auto-reload is true');
      done();
    });

    it('should not call createFileListener and activateFileListener when auto-reload is false', function (done) {
      let createCalled = false;
      Master.createFileListener = () => {
        createCalled = true;
      };

      let activateCalled = false;
      Master.activateFileListener = () => {
        activateCalled = true;
      };

      Master.initialize();

      expect(createCalled).to.equal(false, 'should not create file listener when autoReload is false');
      expect(activateCalled).to.equal(false, 'should not activate file listener when autoReload is false');
      done();
    });

    it('should call fork os.cpus().length times', function (done) {
      const cpus = process.env.CI ? 2 : os.cpus().length;

      // Overwrite fork so we do not actually fork a child process
      let forkCalled = 0;
      let listenCalled = 0;
      Master.forkWorker = () => {
        forkCalled += 1;
      };
      Master.listen = () => {
        listenCalled += 1;
        return Promise.resolve();
      };

      Master.initialize().then(() => {
        expect(forkCalled).to.equal(cpus, 'Should fork worker for each cpu core.');
        expect(listenCalled).to.equal(1, 'sould call listen once');
        done();
      }).catch(done);
    });
  });

  describe('handleWorkerRestart', function () {
    it('should call reloadAllWorkers', function (done) {
      Master.reloadAllWorkers = done;
      Master.handleWorkerRestart(undefined, undefined);
    });
  });

  describe('getStats', function () {
    it('should return object with valid fields', function () {
      Master.getStats()
        .then((stats) => {
          expect(stats).to.have.property('master');
          expect(stats).to.have.property('os');
          expect(stats).to.have.property('osStats');
          expect(stats).to.have.property('workers');
          expect(stats).to.have.property('hostname');

          expect(stats.master).to.have.property('coresUsed');

          expect(stats.osStats).to.have.property('averageLoad');
          expect(stats.osStats).to.have.property('memoryUsageAtBoot');
          expect(stats.osStats).to.have.property('totalMem');
          expect(stats.osStats).to.have.property('currentMemoryUsage');
          expect(stats.osStats).to.have.property('cpu');
        });
    });
  });

  describe('statusHandler', function () {
    it('should emit event (data.id) with (Master.getStats()) data', function (done) {
      Master.getStats = () => Promise.resolve('handler_testData');

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
    let forkEmitter;

    before(function () {
      cluster.fork = () => {
        forkCalled = true;
        return forkEmitter;
      };
    });

    beforeEach(function (done) {
      forkEmitter = new EventEmitter();
      forkCalled = false;
      done();
    });

    it('should call fork', function () {
      const forkPromise = Master.forkWorker().then(() => {
        expect(forkCalled).to.equal(true);
        expect(forkEmitter.listenerCount('exit')).to
          .equal(1, 'Should remove rejecting exit event listener before rejecting.');
        expect(forkEmitter.listenerCount('listening')).to
          .equal(1, 'Should still listen to listening events');
        expect(forkEmitter.listenerCount('message')).to
          .equal(1, 'Should listen to message events');
      });

      forkEmitter.emit('listening');
      return forkPromise;
    });

    it('should reject promise on early exit', function () {
      const forkPromise = Master.forkWorker();
      forkEmitter.emit('exit');

      return expect(forkPromise).to.eventually.be.rejectedWith(Error, 'Should not exit before listening event.');
    });

    it('should redirect message from worker to onWorkerMessage', function () {
      Master.onWorkerMessage = (data) => {
        expect(data).to.equal('data');
        forkEmitter.emit('listening');
      };

      const forkPromise = Master.forkWorker();

      forkEmitter.emit('message', 'data');
      return forkPromise;
    });
  });

  describe('onWorkerMessage', function () {
    it('should pass event message to correct handler', function (done) {
      eventBus.clusterEventHandler = (worker, data) => {
        expect(data).to.have.property('type', 'event');
        expect(data).to.have.deep.property('args', ['arg1', 'arg2', 'arg3']);
        done();
      };

      const data = {type: 'event', args: ['arg1', 'arg2', 'arg3']};
      Master.onWorkerMessage.call({id: 1}, data);
    });

    it('should throw error with missing message type', function (done) {
      const data = 'fork_TestData';
      expect(Master.onWorkerMessage.bind({}, data)).not.to.throw();
      done();
    });

    it('should throw error with unknown message type', function (done) {
      const data = {type: 'Desbug', data: 'fork_TestData'};
      expect(Master.onWorkerMessage.bind({}, data)).not.to.throw();
      done();
    });
  });

  describe('logMasterDeath', function () {
    it('should return 2 with signal', function (done) {
      expect(Master.logMasterDeath(undefined, 'SAIGNAL')).to.equal(2);
      done();
    });

    it('should return 1 with no signal and a nonzero code', function (done) {
      expect(Master.logMasterDeath(1235, undefined)).to.equal(1);
      done();
    });

    it('should return 0 with success code', function (done) {
      expect(Master.logMasterDeath(0, undefined)).to.equal(0);
      done();
    });
  });

  describe('logWorkerDeath', function () {
    it('should return 2 with signal', function (done) {
      expect(Master.logWorkerDeath({id: 'ID1'}, undefined, 'SAIGNAL')).to.equal(2);
      done();
    });

    it('should return 1 with no signal and a nonzero code', function (done) {
      expect(Master.logWorkerDeath({id: 'ID2'}, 1235, undefined)).to.equal(1);
      done();
    });

    it('should return 0 with success code', function (done) {
      expect(Master.logWorkerDeath({id: 'ID3'}, 0, undefined)).to.equal(0);
      done();
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

      cluster.workers = {1: worker1, 2: worker2, 3: worker3};
      return Master.handleSIGINT().then(() => {
        process.exit = processExitFunction;
        expect(killCalled1).to.equal(true,
          'Kill function should be called for worker 1.');
        expect(killCalled2).to.equal(true,
          'Kill function should be called for worker 2.');
        expect(killCalled3).to.equal(true,
          'Kill function should be called for worker 3.');

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
      Master.forkWorker = () => done();

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

  describe('killWorker', function () {
    beforeEach(function () {
      Master.SIGINT_TIMEOUT = 100;
      Master.GIGTERM_TIMEOUT = 100;
      Master.SIGKILL_TIMEOUT = 100;
      return Promise.resolve();
    });

    const shouldReject = promise => new Promise((resolve, reject) => {
      promise
        .then(reject)
        .catch(resolve);
    });
    it('should kill worker when SIGINT success', function () {
      const worker = new EventEmitter();
      let killCalled = false;
      worker.kill = (signal) => {
        expect(signal).to.equal('SIGINT');
        killCalled = true;
        worker.emit('exit');
      };
      return Master.killWorker(worker)
        .then(() => { expect(killCalled).to.equal(true); });
    });
    it('should give second chance to kill worker with SIGTERM', function () {
      const worker = new EventEmitter();
      let killCalled = false;
      let iteration = 0;
      worker.kill = (signal) => {
        iteration += 1;
        if (iteration === 1) {
          expect(signal).to.equal('SIGINT');
        } else if (iteration === 2) {
          expect(signal).to.equal('SIGTERM');
          killCalled = true;
          worker.emit('exit');
        } else {
          throw new Error('should no go here.');
        }
      };
      return Master.killWorker(worker)
        .then(() => { expect(killCalled).to.equal(true); });
    });
    it('should give third chance to kill worker with SIGKILL', function () {
      const worker = new EventEmitter();
      let killCalled = false;
      let iteration = 0;
      worker.kill = (signal) => {
        iteration += 1;
        if (iteration === 1) {
          expect(signal).to.equal('SIGINT');
        } else if (iteration === 2) {
          expect(signal).to.equal('SIGTERM');
        } else if (iteration === 3) {
          expect(signal).to.equal('SIGKILL');
          killCalled = true;
          worker.emit('exit');
        } else {
          throw new Error('should no go here.');
        }
      };
      return Master.killWorker(worker)
        .then(() => { expect(killCalled).to.equal(true); });
    });
    it('should reject if cannot kill worker', function () {
      const worker = new EventEmitter();
      let killCalled = false;
      let iteration = 0;
      worker.kill = (signal) => {
        iteration += 1;
        if (iteration === 1) {
          expect(signal).to.equal('SIGINT');
        } else if (iteration === 2) {
          expect(signal).to.equal('SIGTERM');
        } else if (iteration === 3) {
          expect(signal).to.equal('SIGKILL');
          killCalled = true;
        } else {
          throw new Error('should no go here.');
        }
      };
      return shouldReject(Master.killWorker(worker)
        .catch((error) => {
          expect(killCalled).to.equal(true);
          throw error;
        }));
    });
    it('should catch kill exception', function () {
      const worker = new EventEmitter();
      worker.kill = () => {
        throw new Error('ohno');
      };
      return shouldReject(Master.killWorker(worker)
        .catch((error) => {
          expect(error.message).to.equal('ohno');
          throw error;
        }));
    });
  });

  describe('killAllWorkers', function () {
    it('should call kill for all workers defined in the cluster', function () {
      const workers = ['worker1', 'worker2', 'worker3'];

      let killCalled = 0;
      Master.killWorker = (worker) => {
        expect(worker).to.equal(workers[killCalled]);
        killCalled += 1;
        return Promise.resolve;
      };

      cluster.workers = workers;

      return Master.killAllWorkers()
        .then(() => { expect(killCalled).to.equal(3); });
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

      return Master.reloadWorker(worker)
        .then(() => { expect(killCalled).to.equal(true); });
    });
  });

  describe('reloadAllWorkers', function () {
    it('should call reload for all workers defined in the cluster', function () {
      const workers = ['worker1', 'worker2', 'worker3'];

      let reloadCalled = 0;
      Master.reloadWorker = (worker) => {
        expect(worker).to.equal(workers[reloadCalled]);
        reloadCalled += 1;
        return Promise.resolve;
      };

      cluster.workers = workers;

      return Master.reloadAllWorkers()
        .then(() => { expect(reloadCalled).to.equal(3); });
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
    it('should emit systemRestartNeeded when master file changed', function (done) {
      eventBus.on('workerRestartNeeded', () => { done(new Error('Should not restart workers.')); });
      eventBus.on('systemRestartNeeded', (meta, reason) => {
        expect(reason).to.equal(`file changed: ${path.join('app', 'master.js')}`);
        done();
      });

      const watcher = new EventEmitter();
      Master.activateFileListener(watcher);

      // Emit a change event
      watcher.emit('all', 'change', path.join('app', 'master.js'));
    });

    it('should emit workerRestartEvent when a worker file is edited', function (done) {
      eventBus.on('workerRestartNeeded', (meta, reason) => {
        expect(reason).to.equal('file changed: random-file.js');
        done();
      });
      eventBus.on('systemRestartNeeded', () => { done(new Error('Should not restart system')); });

      const watcher = new EventEmitter();
      Master.activateFileListener(watcher);

      // Emit a change event
      watcher.emit('all', 'change', 'random-file.js');
    });

    it('should not trigger restarts with unlistened events', function (done) {
      eventBus.on('workerRestartNeeded', () => { done(new Error('Should not restart workers.')); });
      eventBus.on('systemRestartNeeded', () => { done(new Error('Should not restart system')); });

      const watcher = new EventEmitter();
      Master.activateFileListener(watcher);

      // Emit a change event
      watcher.emit('all', 'chuaange', 'random-file.js');
      done();
    });
  });

  describe('deactivateFileListener', function () {
    it('should call removeAllListeners', function (done) {
      const watcher = {
        close: () => done()
      };

      Master.deactivateFileListener(watcher);
    });
  });
});
