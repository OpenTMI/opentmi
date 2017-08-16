/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Native components
const cluster = require('cluster');
const path = require('path');

// Third party components
const chai = require('chai');

// Local components
let eventbus = require('../../../../app/tools/eventBus');
let localBus = require('../../../../app/tools/eventBus/local-event-bus');
let clusterBus = require('../../../../app/tools/eventBus/cluster-event-bus');

// Test variables
const expect = chai.expect;
const eventBusPath = path.resolve('app/tools/eventBus');

describe('tools/eventBus', function () {
  beforeEach(function () {
    delete require.cache[path.join(eventBusPath, 'index.js')];
    eventbus = require('../../../../app/tools/eventBus'); // eslint-disable-line

    delete require.cache[path.join(eventBusPath, 'local-event-bus')];
    localBus = require('../../../../app/tools/eventBus/local-event-bus'); // eslint-disable-line

    delete require.cache[path.join(eventBusPath, 'cluster-event-bus')];
    clusterBus = require('../../../../app/tools/eventBus/cluster-event-bus'); // eslint-disable-line
  });

  describe('exports', function () {
    it('should expose proper functions', function (done) {
      expect(eventbus).to.have.property('clusterEventHandler');
      expect(eventbus).to.have.property('Event');
      expect(eventbus).to.have.property('emit');
      expect(eventbus).to.have.property('on');
      expect(eventbus).to.have.property('removeListener');
      expect(eventbus).to.have.property('removeAllListeners');
      done();
    });
  });

  describe('clusterEventHandler', function () {
    it('should emit/forward message to local and cluster busses', function (done) {
      // Simulate master thread
      cluster.isMaster = true;
      cluster.isWorker = false;

      // Spy for local emitter
      let locallyEmitted = false;
      localBus.emit = (event) => {
        expect(event).to.have.property('type', 'event');
        expect(event).to.have.property('name', 'neim');
        expect(event).to.have.deep.property('meta');
        expect(event.meta).to.have.property('key', 'value');
        expect(event).to.have.deep.property('data', ['dota']);

        locallyEmitted = true;
      };

      // Spy for cluster emitter
      let clusterForwarded = false;
      clusterBus.forward = (event) => {
        expect(event).to.have.property('type', 'event');
        expect(event).to.have.property('name', 'neim');
        expect(event).to.have.deep.property('meta');
        expect(event.meta).to.have.property('key', 'value');
        expect(event).to.have.deep.property('data', ['dota']);

        clusterForwarded = true;
      };

      eventbus.clusterEventHandler({id: 1}, {type: 'event', name: 'neim', meta: {key: 'value'}, data: ['dota']});

      expect(locallyEmitted).to.equal(true, 'event should be emitted locally');
      expect(clusterForwarded).to.equal(true, 'event should be propagated to workers');

      done();
    });

    it('should add worker id to the events meta', function (done) {
      // Simulate master thread
      cluster.isMaster = true;
      cluster.isWorker = false;

      // Spy for local emitter
      let locallyEmitted = false;
      localBus.emit = (event) => {
        // Should have automagically appended worker "id" property
        expect(event.meta).to.have.property('id', 1);
        locallyEmitted = true;
      };

      eventbus.clusterEventHandler({id: 1}, {type: 'event', name: 'neim', meta: {key: 'value'}, data: ['dota']});

      expect(locallyEmitted).to.equal(true, 'event should be emitted locally');
      done();
    });

    it('should only emit to localbus if process is a worker.', function (done) {
      // Simulate worker thread
      cluster.isMaster = false;
      cluster.isWorker = true;

      // Spy for local emitter
      let locallyEmitted = false;
      localBus.emit = (event) => {
        expect(event).to.have.property('type', 'event');
        expect(event).to.have.property('name', 'neim');
        expect(event).to.have.deep.property('meta');
        expect(event.meta).to.have.property('key', 'value');
        expect(event).to.have.deep.property('data', ['dota']);

        locallyEmitted = true;
      };

      // Spy for cluster emitter
      let clusterForwarded = false;
      clusterBus.forward = () => {
        clusterForwarded = true;
      };

      eventbus.clusterEventHandler({id: 1}, {type: 'event', name: 'neim', meta: {key: 'value'}, data: ['dota']});

      expect(locallyEmitted).to.equal(true, 'event should be emitted locally');
      expect(clusterForwarded).to.equal(false,
        'event should not be forwarded in worker processes, that makes little sense');

      done();
    });
  });

  describe('emit', function () {
    it('should emit message to both local and cluster bus', function (done) {
      // Spy for local emitter
      let locallyEmitted = false;
      localBus.emit = (event) => {
        expect(event).to.have.property('type', 'event');
        expect(event).to.have.property('name', 'mocking_event');
        expect(event).to.have.deep.property('data', ['deita']);

        locallyEmitted = true;
      };

      // Spy for cluster emitter
      let clusterEmitted = false;
      clusterBus.emit = (event) => {
        expect(event).to.have.property('type', 'event');
        expect(event).to.have.property('name', 'mocking_event');
        expect(event).to.have.deep.property('data', ['deita']);

        clusterEmitted = true;
      };

      eventbus.emit('mocking_event', 'deita');

      expect(locallyEmitted).to.equal(true, 'event should be emitted locally');
      expect(clusterEmitted).to.equal(true, 'event should be emitted to cluster');

      done();
    });
  });
});
