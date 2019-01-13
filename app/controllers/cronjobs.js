/**
  CronJobs Controller
*/

// native modules

// 3rd party modules
const Promise = require('bluebird');
const _ = require('lodash');
const mongoose = require('mongoose');
const {cronPlugin} = require('mongoose-cron');


// own modules
const {Collection, Model, setHandler} = require('../models/cronjob');
const DefaultController = require('./');
const logger = require('../tools/logger');


class CronJobsController extends DefaultController {
  constructor() {
    super(Collection);
    setHandler(this._handler.bind(this));
    Model.on('mongoose-cron:error', this._onError.bind(this));
    this._cron = Model.createCron().start();
    logger.info('Cron started');
  }
  _handler(doc) {
    const prefix = `Cronjob '${doc.name}':`;
    const cronLogger = {
      debug: msg => logger.debug(`${prefix} ${msg}`),
      error: msg => logger.error(`${prefix} ${msg}`),
      warn: msg => logger.warn(`${prefix} ${msg}`),
      info: msg => logger.info(`${prefix} ${msg}`)
    };
    cronLogger.info(`started`);
    const {type} = doc.type;
    const defaultHandler = this._handleViewPipeline;
    const handlers = {
      'view': defaultHandler
      // @todo support for more different types..
    };
    const handler = _.get(handlers, type, defaultHandler);
    const startTime = new Date();
    return handler.bind(this)(doc, cronLogger)
        .then(() => {
          const duration = new Date() - startTime;
          cronLogger.info(` took ${duration/1000} seconds`);
        })
        .catch((error) => {
          cronLogger.error(` fails: ${error}, trace: ${error}`);
          console.log(error);
        });
  }
  _handleViewPipeline(doc, cronLogger) {
    const docJson = doc.toJSON();
    const {col, pipeline, view} = docJson.view;

    //validate
    if (_.find(mongoose.modelNames(), view) >= 0 ) {
      const msg = `Cannot overwrite default collections!`;
      cronLogger.warn(msg);
      return Promise.reject(msg);
    }
    if (!col) {
      const msg = `${prefix} coll is missing`;
      cronLogger.warn(msg);
      return Promise.reject(msg);
    }
    if (!view) {
      return Promise.reject(`view is missing`);
    }
    if (!pipeline) {
      return Promise.reject(`pipeline is missing`);
    }
    // all seems to be okay.. ->
    return Model.db.dropCollection(view)
        // no worries even collection drop fails - probably it did not exists..
        // @todo check first before removing
        .catch(() => {})
        .then(() => Promise.try(() => JSON.parse(pipeline)))
        .then(jsonPipeline => Model.db.createCollection(view, { viewOn: col, pipeline: jsonPipeline }));
  }
  _onError(err, doc) {
    logger.error(`Cronjob '${doc.name}' error: ${err}`)
    console.log(error);
  }
}

module.exports = CronJobsController;
