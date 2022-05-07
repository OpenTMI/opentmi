/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const {expect} = require('chai');

// Native components
const path = require('path');

// Test variables
const pathToFile = path.resolve('app/tools/eventBus/local-event-bus.js');
let localEventBus = require('../../../../app/tools/eventBus/local-event-bus');

describe('eventBus/local-event-bus.js', function () {
  describe('exports', function () {
    it('should exports class named LocalEventBus', function (done) {
      expect(localEventBus.constructor.name).to.equal('LocalEventBus');
      done();
    });
  });

  describe('LocalEventBus', function () {
    beforeEach(function () {
      delete require.cache[pathToFile];
      localEventBus = require( // eslint-disable-line global-require
        '../../../../app/tools/eventBus/local-event-bus'
      );
    });

    describe('emit', function () {
      it('should call _broadcast and _internal', function (done) {
        let broadcastCalled = false;
        localEventBus._broadcast = (event) => {
          expect(event).to.equal('event_data');
          broadcastCalled = true;
        };

        let internalCalled = false;
        localEventBus._internal = (event) => {
          expect(event).to.equal('event_data');
          internalCalled = true;
        };

        // Test call emit
        localEventBus.emit('event_data');

        expect(broadcastCalled).to.equal(true, 'emit should call _broadcast');
        expect(internalCalled).to.equal(true, 'emit should call _internal');

        done();
      });
    });

    describe('_broadcast', function () {
      it('should emit event to "*" channel', function (done) {
        const event = {
          name: 'test_event_name',
          meta: 'test_event_meta',
          data: ['data1', 'data2', 'data3']
        };

        let broadcastReceived = false;
        localEventBus.on('*', (name, meta, ...data) => {
          expect(name).to.equal('test_event_name');
          expect(meta).to.equal('test_event_meta');
          expect(data).to.deep.equal(['data1', 'data2', 'data3']);
          broadcastReceived = true;
        });

        localEventBus._broadcast(event);
        expect(broadcastReceived).to.equal(true, 'emit should be called with "*" name');

        done();
      });
    });

    describe('_internal', function () {
      it('should emit event to "event.name" channel', function (done) {
        const event = {
          name: 'test_event_name',
          meta: 'test_event_meta',
          data: ['data1', 'data2', 'data3']
        };

        let internalReceived = false;
        localEventBus.on(event.name, (meta, ...data) => {
          expect(meta).to.equal('test_event_meta');
          expect(data).to.deep.equal(['data1', 'data2', 'data3']);
          internalReceived = true;
        });

        localEventBus._internal(event);
        expect(internalReceived).to.equal(true, 'emit should be called with test_event_name name');

        done();
      });
    });
  });
});
