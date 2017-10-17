// internal modules
const fs = require('fs');

// 3rd party modules
const _ = require('lodash');
const Promise = require('bluebird');
const logger = require('../tools/logger');

const models = {};

function ensureIndexes() {
  logger.info(`Ensuring models (${Object.keys(models).length}) indexes...`);
  const ensureModelIndexes = Model => new Promise((resolve) => {
    Model.ensureIndexes((err) => {
      if (err) {
        logger.error(`Index error: ${err.message}`);
        logger.info('Seems that your DB indexes causes conflicts, ');
        logger.info('Please remove all of them manually and let opentmi create them again.');
        logger.info('Otherwise OpenTMI might not work correctly');
        // do not stop for now - let user to decide when to fix indexes from DB
      }
      resolve();
    });
  });
  const pending = _.map(models, ensureModelIndexes);
  return Promise.all(pending)
    .then(() => {
      logger.info('Ensuring indexes completed.');
    })
    .catch((err) => {
      logger.error(`Ensuring indexes failed: ${err}.`);
      throw err;
    });
}

function registerModels() {
  logger.info('Registering models..');
  fs.readdirSync(__dirname).forEach((file) => {
    if (file.match(/\.js$/) &&
      !file.match(/^index\.js$/) &&
      !file.match(/^\./)) {
      try {
        const filename = `${__dirname}/${file}`;
        logger.silly(`Reading: ${filename}.`);
        const model = require(filename); // eslint-disable-line global-require, import/no-dynamic-require

        if (_.get(model, 'Collection') && _.isString(model.Collection)) {
          if (!_.has(models, model.Collection)) {
            models[model.Collection] = model.Model;
            logger.verbose(` * ${model.Collection}`);
          } else {
            logger.error('Two models registered to same collection!');
          }
          const Model = _.get(model, 'Model');
          if (Model) {
            Model
              .on('error', (error) => {
                // gets an error whenever index build fails
                logger.warn('model error:', error.message);
              });
          }
        } else {
          logger.info(model);
        }
      } catch (err) {
        logger.warn(err);
      }
    }
  });
  return ensureIndexes();
}

module.exports = {registerModels, ensureIndexes};
