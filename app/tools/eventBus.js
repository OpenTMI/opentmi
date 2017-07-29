// Internal modules
const EventEmitter = require('events');
const cluster = require('cluster');

class Emitter extends EventEmitter {
  emit(...args) {
    const [event, ...data] = args;
    super.emit('*', event, data);

    if (!cluster.isMaster) {
      // proxy all worker events to master
      process.send({type: 'event', event, data});
    }
    super.emit(...args);
  }
}
const eventBus = new Emitter();

module.exports = eventBus;
global.pubsub = eventBus; // backward compatible reason
