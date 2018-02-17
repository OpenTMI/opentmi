const express = require('express');

class AddonCore {
  constructor(app, server, io, eventBus, logger) {
    // Defined variables
    this.logger = logger;
    this.router = express.Router();
    this.staticPath = { prefix: '/test', folder: '/public/' };

    // Own variables
    this.server = server;
    this.io = io;
  }

  // Default implementation of register
  register() {
    this.logger.warn('registering instance of sample class');
    this.router.get('/test', (req, res) => {
      res.json({ ok: 1 });
    });

    this.io.on('connection', (socket) => {
      this.logger.info('Io connection made.');
      socket.emit('test', 'hello client');
      socket.on('hello', (data) => {
        this.logger.info(data);
      });
      socket.broadcast.emit('test', 'broadcast msg!');
      socket.emit('test', 'hello-world');
    });
  }

  unregister() {
    this.logger.warn('unregistering instance of sample class');
  }
}


module.exports = AddonCore;
