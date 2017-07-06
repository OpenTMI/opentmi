'use strict';

// native modules
const fs = require('fs');

// 3rd party modules
const Express = require('express');
const logger = require('winston');
const SocketIO = require('socket.io');

// application modules
const express = require('./express')
const Server = require('./server')
const nconf = require('../config');
const eventBus = require('./tools/eventBus');
const models = require('./models');
const routes = require('./routes');
const AddonManager = require('./addons');

if (nconf.get('help') || nconf.get('h')) {
  nconf.stores.argv.showHelp()
  process.exit(0);
}

// Define logger behaviour
logger.cli(); // activates colors

// define console logging level
logger.level = nconf.get('silent') ? 'error' : ['info', 'debug', 'verbose', 'silly'][nconf.get('verbose') % 4];

// Add winston file logger, which rotates daily
var fileLevel = 'silly';
logger.add(require('winston-daily-rotate-file'), {
  filename: 'log/app.log',
  json: false,
  handleExceptions: false,
  level: fileLevel,
  datePatter: '.yyyy-MM-dd_HH-mm'
});
logger.debug('Using cfg: %s', nconf.get('cfg'));

// create express instance
const app = Express();

// Create HTTP server.
const server = Server(app);

// register socket io
const io = SocketIO(server);

// Initialize database connetion
require('./db');

// Connect models
models.registerModels();

// Bootstrap application settings
express(app);

// Bootstrap routes
routes.registerRoutes(app);

// Bootsrap addons, like default webGUI
global.AddonManager = new AddonManager(app, server, io);
global.AddonManager.RegisterAddons();

// Add final route for error
routes.registerErrorRoute(app);

function onError(error) {
  if( error.code === 'EACCES' && nconf.get('port') < 1024 ) {
    logger.error("You haven't access to open port below 1024");
    logger.error("Please use admin rights if you wan't to use port %d!", nconf.get('port'));
  } else {
    logger.error(error);
  }
  process.exit(-1);
};
function onListening() {
  let listenurl = (nconf.get('https')?'https':'http:')+'://'+nconf.get('listen')+':'+nconf.get('port');
  console.log('OpenTMI started on ' +listenurl+ ' in '+ nconf.get('cfg')+ ' mode');
  eventBus.emit('start_listening', {url: listenurl});
};

server.listen(nconf.get('port'), nconf.get('listen'));
server.on('error', onError);
server.on('listening', onListening);

// this would be usefull for testing
module.exports = {
  server: server,
  eventBus: eventBus
}
