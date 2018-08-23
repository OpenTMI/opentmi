const cluster = require('cluster');

// 3rd party modules
const Express = require('express');
const SocketIO = require('socket.io');
const mongoAdapter = require('socket.io-adapter-mongo');
const Promise = require('bluebird');

// application modules
const express = require('./express');
const Server = require('./server');
const models = require('./models');
const routes = require('./routes');
const AddonManager = require('./addons');
const logger = require('./tools/logger');
const config = require('./tools/config');
const eventBus = require('./tools/eventBus');
const DB = require('./db');


if (config.get('help') || config.get('h')) {
  config.stores.argv.showHelp();
  process.exit(0);
}

// Defines
const https = config.get('https');
const listen = cluster.isMaster ? config.get('listen') : 'localhost';
const port = cluster.isMaster ? config.get('port') : 0;
const dbUrl = config.get('db');


// Create express instance
const app = Express();

// Create HTTP server.
const server = Server(app);

// Register socket io
const io = SocketIO(server);

// Register mongo adapter for socket.io
const ioAdapter = mongoAdapter(dbUrl);
io.adapter(ioAdapter);

// Initialize database connection
DB.connect()
  .catch((error) => {
    console.error('mongoDB connection failed: ', error.stack); // eslint-disable-line no-console
    process.exit(-1);
  })
  .then(() => models.registerModels())
  .then(() => express(app))
  .then(() => routes.registerRoutes(app, io))
  .then(() => AddonManager.init(app, server, io, eventBus))
  .then(() => AddonManager.loadAddons())
  .then(() => AddonManager.registerAddons())
  // Error route should be initialized after addonmanager has served all static routes
  .then(() => routes.registerErrorRoute(app))
  .then(() => {
    function onError(error) {
      if (error.code === 'EACCES' && port < 1024) {
        console.error("You haven't access to open port below 1024"); // eslint-disable-line no-console
        console.error("Please use admin rights if you wan't to use port %d!", port); // eslint-disable-line no-console
      } else if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`); // eslint-disable-line no-console
      } else {
        console.error(error); // eslint-disable-line no-console
      }
      process.exit(-1);
    }

    function onListening() {
      const listenurl = `${(https ? 'https' : 'http:')}://${listen}:${port}`;
      logger.info(`OpenTMI started on ${listenurl}`);
      eventBus.emit('start_listening', {url: listenurl});
    }
    server.on('error', onError);
    server.on('listening', onListening);
    server.listen(port, listen);

    const termination = (signal) => {
      // server.close stops worker from accepting new requests and finishes currently processed requests
      logger.warn(`${signal} received, attempt to exit OpenTMI`);
      logger.debug('Closing socketIO server..');
      const ioClose = Promise.promisify(io.close, {context: io});
      const restClose = Promise.promisify(server.close, {context: server});
      io.emit('exit');
      ioClose()
        .timeout(1000)
        .catch((error) => { logger.warn(`io closing fails: ${error}`); })
        .then(() => logger.debug('Closing express server'))
        .then(() => restClose()
          .timeout(1000)
          .catch((error) => { logger.warn(`restClose fails: ${error}`); }))
        .then(() => logger.debug('Closing DB connection'))
        .then(() => DB.disconnect().timeout(2000))
        .catch((error) => {
          console.error(`shutdown Error: ${error}`); // eslint-disable-line no-console
        })
        .finally(() => {
          console.info('Exit OpenTMI'); // eslint-disable-line no-console
          process.exit(0);
        });
    };
    // Close the Mongoose connection, when receiving SIGINT or SIGTERM
    process.on('SIGINT', () => termination('SIGINT'));
    process.on('SIGTERM', () => {}); //termination('SIGTERM'));
  })
  .catch((error) => {
    console.error('Exception during initialization: ', error); // eslint-disable-line no-console
    process.exit(-1);
  });

// This would be useful for testing
module.exports = {server, eventBus};
