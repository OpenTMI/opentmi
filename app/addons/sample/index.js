const express = require('express');
const logger = require('../../tools/logger');

class AddonCore {
  constructor(app, server, io) {
    // Defined variables
    this.router = express.Router();
    this.staticPath = { prefix: '/test', folder: '/public/' };

    // Own variables
    this.server = server;
    this.io = io;
  }

  // Default implementation of register
  register() {
    logger.warn('registering instance of sample class');
    this.router.get('/test', (req, res) => {
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

  unregister() {
    logger.warn('unregistering instance of sample class');
  }
}


module.exports = AddonCore;
