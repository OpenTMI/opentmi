const logger = require('winston');

class AddonCore {
  constructor(app, server, io, passport) {
    this.name = 'default addon name';
    this.description = 'default addon description';

    this.app = app;
    this.server = server;
    this.io = io;
  }

  // Default implementation of register
  register() {
    logger.warn('registering instance of AddonCore class');
    this.app.get('/test', (req, res) => {
      res.json({ ok: 1 });
    });

    this.io.on('connection', function (socket) {
      logger.info('Io connection made.');
      socket.emit('test', 'hello client');
      socket.on('hello', function (data) {
        logger.info(data);
      });
      socket.broadcast.emit('test', 'broadcast msg!');
      socket.emit('test', 'hello-world');
    });
  }
}

module.exports = AddonCore;
