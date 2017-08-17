const cluster = require('cluster');
const _ = require('lodash');
const logger = require('../logger');

function forward(event) {
  if (cluster.isMaster) {
    _.each(cluster.workers, (worker, id) => {
      if (`${id}` !== `${event.meta.id}`) {
        logger.silly(`Sending event to Worker#${id}.`);
        if (worker.isConnected()) {
          worker.send(event.toJSON());
        }
      } else {
        // do not send event back to worker
        logger.silly(`Skip Worker#${id}.`);
      }
    });
  } else {
    logger.warn('Worker tried to forward an event.');
  }
}

function emit(event) {
  if (cluster.isMaster) {
    _.each(cluster.workers, (worker, id) => {
      logger.silly(`Sending event to Worker#${id}.`);
      if (worker.isConnected()) {
        // @todo better intercommunication..
        worker.send(event.toJSON());
      }
    });
  } else {
    logger.silly('Sending event to Master');
    process.send(event.toJSON());
  }
}

module.exports = {
  forward,
  emit
};
