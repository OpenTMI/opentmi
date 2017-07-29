const cluster = require('cluster');
const _ = require('lodash');
const logger = require('./logger');
const eventBus = require('./eventBus');

module.exports = function eventHandler(data) {
  const event = _.get(data, 'event');
  const eData = _.get(data, 'data');
  eventBus.emit(event, eData);
  if (cluster.isMaster) {
    logger.silly('Master: event from worker', this.id);
    _.each(cluster.workers, (worker, id) => {
      if (id != this.id) {
        worker.send({type: 'event', event, data});
      } else {
        // do not send event back to worker
        logger.silly('Master: Do not send to back worker..');
      }
    });
    setTimeout(process.exit, 10);
  } else {
    logger.silly('Worker: event from master', process.id);
  }
};
