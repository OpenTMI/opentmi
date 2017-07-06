// internal modules
const fs = require('fs');

// 3rd party modules
const logger = require('winston');

function registerRoutes(app)
{
  logger.info("Add Routers..");
  fs.readdirSync(__dirname).forEach(function (file) {
    if (!file.match(/index\.js$/) &&
         file.match(/\.js$/) &&
        !file.match(/error\.js$/)) {
      logger.verbose(' * '+file);
      require(`${__dirname}/${file}`)(app);
    }
  });
}
module.exports.registerRoutes = registerRoutes;

function registerErrorRoute(app)
{
  require(`${__dirname}/error.js`)(app);
}
module.exports.registerErrorRoute = registerErrorRoute;
