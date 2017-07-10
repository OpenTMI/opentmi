// internal modules
const fs = require('fs');

// 3rd party modules
const _ = require('lodash');
const logger = require('winston');

function registerRoutes(app) {
  logger.info("Add Routers..");
  fs.readdirSync(__dirname).forEach((file) => {
    if ( file.match(/\.js$/) &&
        !file.match(/^index\.js$/) &&
        !file.match(/^error\.js$/)) {
      logger.verbose(' * '+file);
      try {
          let filename = `${__dirname}/${file}`;
          logger.silly(`Loading file: ${filename}`);
          let router = require(filename);
          if(_.isFunction(router)) {
              router(app);
          } else {
              logger.warn("Wasn't function!!!");
          }
      } catch(err) {
          logger.warn(err);
      }
    }
  });
}
module.exports.registerRoutes = registerRoutes;

function registerErrorRoute(app) {
  require(`${__dirname}/error.js`)(app);
}

module.exports.registerErrorRoute = registerErrorRoute;
