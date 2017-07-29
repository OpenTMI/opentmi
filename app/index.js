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
const verbose = nconf.get('verbose');
const silent = nconf.get('silent');
const configuration = nconf.get('cfg');

// define console logging level
logger.level = silent ? 'error' : ['info', 'debug', 'verbose', 'silly'][verbose % 4];

logger.debug(`Using cfg: ${configuration}`);

// Create express instance
const app = Express();

// Create HTTP server.
const server = Server(app);

// Register socket io
const io = SocketIO(server);

// Initialize database connection
DB.connect().catch((error) => {
  logger.error('mongoDB connection failed: ', error.message);
  process.exit(-1);
}).then(() => models.registerModels())
  .then(() => express(app))
  .then(() => routes.registerRoutes(app))
  .then(() => AddonManager.init(app, server, io))
  .then(() => AddonManager.loadAddons())
  .then(() => AddonManager.registerAddons())
  .then(() =>
    // Error route should be initialized after addonmanager has served all static routes
    routes.registerErrorRoute(app)
  )
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
      logger.info(`OpenTMI started on ${listenurl} in ${configuration} mode`);
      eventBus.emit('start_listening', {url: listenurl});
    }
    server.on('error', onError);
    server.on('listening', onListening);
    server.listen(port, listen);

    // Close the Mongoose connection, when receiving SIGINT
    process.on('SIGINT', () => {
      DB.disconnect().then(() => {
        process.exit(0);
      }).catch((err) => {
        logger.error(`Disconnection fails: ${err}`);
        process.exit(-1);
      });
    });
  });

// This would be useful for testing
module.exports = {server, eventBus};
