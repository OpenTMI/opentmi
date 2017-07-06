// internal modules
const fs = require('fs');

// 3rd party modules
const logger = require('winston');

function registerModels(app)
{
  logger.info("Register models..");
  fs.readdirSync(__dirname).forEach(function (file) {
    if (!file.match(/index\.js$/) &&
         file.match(/\.js$/) &&
        !file.match(/^\./)) {
      logger.verbose(' * '+file);
      require(`${__dirname}/${file}`);
    }
  });
}
module.exports.registerModels = registerModels;
