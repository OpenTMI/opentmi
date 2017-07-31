// Internal modules
const EventEmitter = require('events');
const cluster = require('cluster');

class Emitter extends EventEmitter {
  emit(...args) {
    // by default all events is broadcasted to "*"
    this.broadcast(...args);
    this.internal(...args);
    if (!cluster.isMaster && cluster.worker.isConnected()) {
      // by default proxy all worker events to connected master
      const [event, data] = args;
      const payload = {type: 'event', event, data};
      process.send(payload);
    }
  }
  broadcast(...args) {
    const [event, data] = args;
    super.emit('*', event, data);
  }
  internal(...args) {
    this.broadcast(...args);
    super.emit(args);
  }
}
const eventBus = new Emitter();

module.exports = eventBus;
