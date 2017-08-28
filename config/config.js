/*
Called by nconf from ../app/index.js, fetches correct config file form ./env/
*/
/**
 * Module dependencies.
 */


// Native modules
const path = require('path');
const extend = require('util')._extend;

// Third party modules
const nconf = require('nconf');
const _ = require('lodash');

// application modules
const logger = require('../app/tools/logger');

// Configurations
const development = require('./env/development');
const test = require('./env/test');
const production = require('./env/production');

const envConfigs = {development, test, production};
const env = nconf.get('env');

if (!_.has(envConfigs, env)) {
  console.error(`env configuration (${env}) is not valid!`); /*eslint no-console: "none"*/
  process.exit(1);
}

const defaults = {
  root: path.normalize(path.join(__dirname, '..')),
  cfg: env
};
const config = extend(envConfigs[env], defaults);

// expose configs
module.exports = config;

