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
      try {
        this._io.to('logs').emit('log', `${info[Symbol.for('message')]}\n`);
      } catch (error) {  // eslint-disable-line
        console.error(error);
      }
    });

    // Perform the writing to the remote service
    callback();
  }
};
