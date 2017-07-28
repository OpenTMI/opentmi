// internal modules
const fs = require('fs');

// 3rd party modules
const _ = require('lodash');
const Promise = require('bluebird');
const logger = require('winston');

const models = {};

function ensureIndexes() { // eslint-disable-line no-unused-vars
  /** @TODO create mechanism to call this in safe way
   * so we do not close db connection before the process is completed
   */
  logger.info('Start ensuring models indexes..');
  const pending = [];
  const ensureModelIndexes = (Model) => {
    const promise = new Promise((resolve, reject) => {
      Model.ensureIndexes((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return promise;
  };
  _.each(models, (Model) => {
    pending.push(ensureModelIndexes(Model));
  });
  return Promise.all(pending).then(() => {
    logger.info('Ensuring ready.');
  }).catch((err) => {
    logger.info(`Ensuring fails: ${err}`);
    throw err;
  });
}

function registerModels() {
  logger.info('Register models..');
  fs.readdirSync(__dirname).forEach((file) => {
    if (file.match(/\.js$/) &&
      !file.match(/^index\.js$/) &&
      !file.match(/^\./)) {
      try {
        const filename = `${__dirname}/${file}`;
        logger.silly(`Reading: ${filename}`);
        const model = require(filename); // eslint-disable-line global-require, import/no-dynamic-require
        if (_.get(model, 'Collection') && _.isString(model.Collection)) {
          if (!_.has(models, model.Collection)) {
            models[model.Collection] = model.Model;
            logger.verbose(` * ${model.Collection}`);
          } else {
            logger.error('Two models registered to same collection!');
          }
        } else {
          logger.info(model);
        }
      } catch (err) {
        logger.warn(err);
      }
    }
  });
  return Promise.resolve();
}

module.exports.registerModels = registerModels;
