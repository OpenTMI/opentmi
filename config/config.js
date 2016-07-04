
/**
 * Module dependencies.
 */
var path = require('path');
var extend = require('util')._extend;

var winston = require('winston');
var nconf = require('nconf');

var development = require('./env/development');
var test = require('./env/test');
var production = require('./env/production');

var defaults = {
  root: path.normalize(__dirname + '/..'),
  cfg: nconf.get('cfg')
};

/**
 * Expose
 */

module.exports = {
  development: extend(development, defaults),
  test: extend(test, defaults),
  production: extend(production, defaults)
}[nconf.get('cfg')];
