const _ = require('lodash');
const cluster = require('cluster');
const logger = require('./tools/logger');
const eventBus = require('./tools/eventBus');

module.exports = function Worker() {
  this.app = undefined;

  const stickyConnection = (connection) => {
    // Emulate a connection event on the server by emitting the
    // event with the connection the master sent us.
    this.app.server.emit('connection', connection);
    connection.resume();
  };

  // worker
  const msgHandlers = {
    shutdown: process.exit,
    event: eventBus.clusterEventHandler,
    'sticky-session:connection': stickyConnection
  };

  process.on('message', (event, data) => {
    const type = _.get(event, 'type');
    if (_.has(msgHandlers, type)) {
      try {
        msgHandlers[type](cluster.worker, event);
      } catch (error) {
        logger.error(`Failed to process event: ${error.stack} | ${JSON.stringify(event)}`);
      }
    } else if (event === 'sticky-session:connection') {
      stickyConnection(data);
    } else {
      logger.warn(`Unknown message type "${type}" to worker`);
    }
  });

  logger.info(`Process: ${process.pid} started`);
  eventBus.on('*', (eventName, meta, ...data) => {
    logger.verbose(`[eventBus] ${eventName} ${JSON.stringify(meta)}: ${JSON.stringify(data)})`);
  });

  this.app = require('.'); // eslint-disable-line global-require

};
