// 3rd party modules
const Express = require('express');
const SocketIO = require('socket.io');

// application modules
const express = require('./express');
const Server = require('./server');
const nconf = require('../config');
const eventBus = require('./tools/eventBus');
const models = require('./models');
const routes = require('./routes');
const AddonManager = require('./addons');
const DB = require('./db');
const logger = require('./tools/logger');

if (nconf.get('help') || nconf.get('h')) {
  nconf.stores.argv.showHelp();
  process.exit(0);
}

// Defines
const https = nconf.get('https');
const listen = nconf.get('listen');
const port = nconf.get('port');
const environment = nconf.get('env');

// Create express instance
const app = Express();

// Create HTTP server.
const server = Server(app);

// Register socket io
const io = SocketIO(server);

// Initialize database connection
DB.connect().catch((error) => {
  logger.error('mongoDB connection failed: ', error.stack);
  process.exit(-1);
}).then(() => models.registerModels())
  .then(() => express(app))
  .then(() => routes.registerRoutes(app))
  .then(() => AddonManager.init(app, server, io))
  .then(() => AddonManager.loadAddons())
  .then(() => AddonManager.registerAddons())
  // Error route should be initialized after addonmanager has served all static routes
  .then(() => routes.registerErrorRoute(app))
  .then(() => {
    function onError(error) {
      if (error.code === 'EACCES' && port < 1024) {
        logger.error("You haven't access to open port below 1024");
        logger.error("Please use admin rights if you wan't to use port %d!", port);
      } else {
        logger.error(error);
      }
      process.exit(-1);
    }

    function onListening() {
      const listenurl = `${(https ? 'https' : 'http:')}://${listen}:${port}`;
      logger.info(`OpenTMI started on ${listenurl} in ${environment} mode`);
      eventBus.emit('start_listening', {url: listenurl});
    }
    server.on('error', onError);
    server.on('listening', onListening);
    server.listen(port, listen);

    // Close the Mongoose connection, when receiving SIGINT
    process.on('SIGINT', () => {
      // server.close stops worker from accepting new requests and finishes currently processed requests
      // @todo test that requests actually get processed
      server.close(() => {
        DB.disconnect().then(() => {
          process.exit(0);
        }).catch((err) => {
          logger.error(`Disconnection from database failed: ${err}`);
          process.exit(-1);
        });
      });
    });
  });

// This would be useful for testing
module.exports = {server, eventBus};
