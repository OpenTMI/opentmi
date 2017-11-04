// Internal modules
const EventEmitter = require('events');

class LocalEventBus extends EventEmitter {
  emit(event) {
    // By default all events also trigger "*" event
    this._broadcast(event);
    this._internal(event);
  }

  _broadcast(event) {
    super.emit('*', event.name, event.meta, ...event.data);
  }

  _internal(event) {
    super.emit(event.name, event.meta, ...event.data);
  }
}

module.exports = new LocalEventBus();

