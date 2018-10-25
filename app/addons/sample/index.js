// 3rd party modules
const express = require('express');
// opentmi modules
const {Addon} = require('opentmi-addon');


class AddonCore extends Addon {
  constructor(...args) {
    super(...args);
    this.router = express.Router();
    this.staticPath = { prefix: '/test', folder: '/public/' };
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
