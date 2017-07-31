// Native modules
const fs = require('fs');

// Third party modules
const Promise = require('bluebird');
const logger = require('../tools/logger');

function registerRoutes(app) {
  logger.info('Add Routers...');
  fs.readdirSync(__dirname).forEach((file) => {
    if (file.match(/\.js$/) && !file.match(/^(index|error)\.js$/)) {
      logger.debug(` * ${file}`);

      try {
        logger.silly(`Loading file: ${file}`);

        const router = require(`./${file}`); // eslint-disable-line global-require, import/no-dynamic-require
        if (typeof router === 'function') {
          router(app);
        } else {
          logger.warn('Router was not a function!');
        }
      } catch (error) {
        logger.warn(error);
      }
    }
  });
  return Promise.resolve();
}

function registerErrorRoute(app) {
  require('./error')(app); // eslint-disable-line global-require, import/no-dynamic-require
}

module.exports = {
  registerRoutes,
  registerErrorRoute
};
