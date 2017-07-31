/*
Called by nconf from ../app/index.js, fetches correct config file form ./env/
*/
/**
 * Module dependencies.
 */

// Native modules
const path = require('path');
const extend = require('util')._extend;
const fs = require('fs');

// Third party modules
const logger = require('../app/tools/logger');
const nconf = require('nconf');

// Configurations
const development = require('./env/development');
const test = require('./env/test');
const production = require('./env/production');


const env = nconf.get('cfg');
const envConfigs = {development, test, production};
const defaults = {
  root: path.normalize(path.join(__dirname, '..')),
  cfg: env
};
const config = extend(envConfigs[env], defaults);

// Make directory for filedb if it is defined
if (config.filedb && config.filedb !== 'mongodb') {
  if (!fs.existsSync(config.filedb)) {
    logger.info('create %s folder for filedb', config.filedb);
    fs.mkdirSync(config.filedb);
  }
}

/**
 * Expose
 */
module.exports = config;
