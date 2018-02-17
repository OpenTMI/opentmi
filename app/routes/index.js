// Native modules
const fs = require('fs');

// Third party modules
const Promise = require('bluebird');
const _ = require('lodash');

// application modules
const logger = require('../tools/logger');
const registerErrorRoute = require('./error');

const readdir = Promise.promisify(fs.readdir);

function register(app, io, file) {
  logger.verbose(` * ${file}`);
  return Promise.try(() => {
    const router = require(`./${file}`); // eslint-disable-line global-require, import/no-dynamic-require
    if (_.isFunction(router)) {
      return router(app, io);
    }
    throw new Error(`${file} did not export an function!`);
  })
    .catch((error) => {
      logger.warn(error);
    });
}

function registerRoutes(app, io) {
  logger.info('Register Routers...');
  const filter = file => file.match(/\.js$/) && !file.match(/^(index|error)\.js$/);
  return readdir(__dirname)
    .then(files => _.filter(files, filter))
    .then(files => Promise.each(files, file => register(app, io, file)));
}

module.exports = {
  registerRoutes,
  registerErrorRoute
};
