/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const {expect} = require('chai');

// Native components
const cluster = require('cluster');

// Test variables
const clusterEventBus = require('../../../../app/tools/eventBus/cluster-event-bus');

describe('eventBus/cluster-event-bus.js', function () {
  let originalMasterStatus = true;
  before(function () { originalMasterStatus = cluster.isMaster; });
  after(function () { cluster.isMaster = originalMasterStatus; });
  beforeEach(function () { cluster.isMaster = originalMasterStatus; });

  describe('exports', function () {
    it('should define forward function', function (done) {
      expect(clusterEventBus).to.have.property('forward');
      expect(clusterEventBus.forward).to.be.a('function');
      done();
    });

    it('should define emit function', function (done) {
      expect(clusterEventBus).to.have.property('emit');
      expect(clusterEventBus.emit).to.be.a('function');
      done();
    });
  });

  describe('forward', function () {
    const event = {
      data: '12345678',
      meta: {id: 1},
      toJSON: () => 'json_12345678'
    };

    afterEach(function () {
      cluster.workers = {};
    });

    it('should forward event to all workers in cluster expect the sender', function (done) {
      let sent1 = false;
      let sent2 = false;
      let sent3 = false;
      cluster.workers = {
        0: {
          isConnected: () => true,
          send(json) {
            sent1 = true;
            expect(json).to.equal('json_12345678');
          }
        },
        1: {
          isConnected: () => true,
          send(json) {
            sent2 = true;
            expect(json).to.equal('json_12345678');
          }
        },
        2: {
          isConnected: () => true,
          send(json) {
            sent3 = true;
            expect(json).to.equal('json_12345678');
          }
        }
      };

      clusterEventBus.forward(event);

      expect(sent1).to.equal(true, 'event should be forwarded to first worker');
      expect(sent2).to.equal(false, 'worker 2 should be skipped');
      expect(sent3).to.equal(true, 'event should be forwarded to third worker');

      done();
    });

    it('should do nothing if the process is not the master', function (done) {
      cluster.isMaster = false;

      let sent1 = false;
      let sent2 = false;
      let sent3 = false;
      cluster.workers = {
        0: {
          isConnected: () => true,
          send() { sent1 = true; }
        },
        1: {
          isConnected: () => true,
          send() { sent2 = true; }
        },
        2: {
          isConnected: () => true,
          send() { sent3 = true; }
        }
      };

      clusterEventBus.forward(event);

      expect(sent1).to.equal(false, 'worker 1 should not receive anything');
      expect(sent2).to.equal(false, 'worker 2 should not receive anything');
      expect(sent3).to.equal(false, 'worker 3 should not receive anything');

      done();
    });
  });

  describe('emit', function () {
    const event = {
      data: '87654321',
      meta: {id: 1},
      toJSON: () => 'json_87654321'
    };

    it('should send event to all workers', function (done) {
      let sent1 = false;
      let sent2 = false;
      let sent3 = false;
      cluster.workers = {
        0: {
          isConnected: () => true,
          send(json) {
            sent1 = true;
            expect(json).to.equal('json_87654321');
          }
        },
        1: {
          isConnected: () => true,
          send(json) {
            sent2 = true;
            expect(json).to.equal('json_87654321');
          }
        },
        2: {
          isConnected: () => true,
          send(json) {
            sent3 = true;
            expect(json).to.equal('json_87654321');
          }
        }
      };

      clusterEventBus.emit(event);

      expect(sent1).to.equal(true, 'event should be emitted to first worker');
      expect(sent2).to.equal(true, 'event should be emitted to second worker');
      expect(sent3).to.equal(true, 'event should be emitted to third worker');

      done();
    });

    it('should not send event to worker that is not connected', function (done) {
      let sent1 = false;
      let sent2 = false;
      let sent3 = false;
      cluster.workers = {
        0: {
          isConnected: () => true,
          send(json) {
            sent1 = true;
            expect(json).to.equal('json_87654321');
          }
        },
        1: {
          isConnected: () => false,
          send(json) {
            sent2 = true;
            expect(json).to.equal('json_87654321');
          }
        },
        2: {
          isConnected: () => false,
          send(json) {
            sent3 = true;
            expect(json).to.equal('json_87654321');
          }
        }
      };

      clusterEventBus.emit(event);

      expect(sent1).to.equal(true, 'event should be emitted to first worker');
      expect(sent2).to.equal(false, 'event should not be emitted to disconnect second worker');
      expect(sent3).to.equal(false, 'event should not be emitted to disconnected third worker');

      done();
    });

    it('should send event to master if process is a worker', function (done) {
      cluster.isMaster = false;

      // Mock process.send
      const oSend = process.send;
      let sent = false;
      process.send = (json) => {
        expect(json).to.equal('json_87654321');
        sent = true;
      };

      clusterEventBus.emit(event);
      expect(sent).to.equal(true, 'emit should call process.send');

      // Reset process.send
      process.send = oSend;

      done();
    });
  });
});
