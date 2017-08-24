// Third party components
const express = require('express');

// Application components
const logger = require('../../tools/logger');


class AddonCore {
  constructor(app, server, io) {
    // Defined variables
    this.staticPath = { prefix: '/test', folder: '/public/' };

    // Own variables
    this.server = server;
    this.io = io;
  }

  // Default implementation of register
  register() {
    this.router = express.Router();
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

  startJobs() {
    logger.warn('starting jobs for sample class');
  }
}


module.exports = AddonCore;
