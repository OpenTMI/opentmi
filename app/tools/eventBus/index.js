// Internal modules
const cluster = require('cluster');

// Third party modules
const logger = require('../logger');

// Local modules
const clusterBus = require('./cluster-event-bus');
const localBus = require('./local-event-bus');
const Event = require('./event.js');

function clusterEventHandler(worker, data) {
  const eventObj = Event.fromObject(data);

  if (cluster.isMaster) {
    logger.silly(`Event from Worker#${worker.id} | ${eventObj.toString()}`);

    // Save sender id
    eventObj.meta.id = worker.id;

    localBus.emit(eventObj);
    clusterBus.forward(eventObj);
  } else {
    logger.silly(`Event from Master | ${eventObj.toString()}`);
    localBus.emit(eventObj);
  }
}

function emit(eventName, ...args) {
  const eventObj = new Event(args, eventName, 'event', {});
  localBus.emit(eventObj);
  clusterBus.emit(eventObj);
}

module.exports = {
  clusterEventHandler: clusterEventHandler,
  Event: Event,
  emit: emit,
  on: localBus.on.bind(localBus),
  once: localBus.once.bind(localBus),
  removeListener: localBus.removeListener.bind(localBus),
  removeAllListeners: localBus.removeAllListeners.bind(localBus)
};
