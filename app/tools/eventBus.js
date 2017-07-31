// Internal modules
const EventEmitter = require('events');
const cluster = require('cluster');

const _ = require('lodash');

class Emitter extends EventEmitter {
  emit(...args) {
    // by default all events is broadcasted to "*"
    this.broadcast(...args);
    this.internal(...args);
    const [event, data] = args;
    const payload = {type: 'event', event, data};
    if (!cluster.isMaster && cluster.worker.isConnected()) {
      // by default proxy all worker events to connected master
      process.send(payload);
    } else if (cluster.isMaster) {
      _.map(cluster.workers, worker => worker.send(payload));
    }
  }
  broadcast(...args) {
    const [event, data] = args;
    super.emit('*', event, data);
  }
  internal(...args) {
    super.emit(...args);
  }
}
const eventBus = new Emitter();

module.exports = eventBus;
