const cluster = require('cluster');
const _ = require('lodash');
const logger = require('./logger');
const eventBus = require('./eventBus');

module.exports = function eventHandler(data) {
  const event = {
    event: _.get(data, 'event'),
    data: _.get(data, 'data')
  };
  if (cluster.isMaster) {
    logger.silly(`Master: event from worker#${this.id}`);
    _.each(cluster.workers, (worker, id) => {
      if (`${id}` !== `${this.id}`) {
        logger.silly(`Master: Sending event to worker#${id}`);
        worker.send(_.defaults({type: 'event'}, event));
      } else {
        // do not send event back to worker
        logger.silly(`Master: Skip worker#${this.id}`);
      }
    });
    eventBus.emit(event.event, event.data);
  } else {
    logger.silly('event from master', process.id);
    // this just send event to internal eventBus -
    // not to master anymore because event was coming from master.
    eventBus.internal(event.event, event.data);
  }
};
