const Transport = require('winston-transport');

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
module.exports = class SocketLoggerTransport extends Transport {
  constructor(io) {
    super();
    this._io = io;
  }

  log(info, callback) {
    setImmediate(() => {
      this._io.to('logs').emit('log', `${info[Symbol.for('message')]}\n`);
    });

    // Perform the writing to the remote service
    callback();
  }
};
