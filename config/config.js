
/**
 * Module dependencies.
 */
var path = require('path');
var extend = require('util')._extend;

var winston = require('winston');

var development = require('./env/development');
var test = require('./env/test');
var production = require('./env/production');


var cfg = process.env.NODE_ENV || 'development';
var defaults = {
  root: path.normalize(__dirname + '/..'),
  cfg: cfg
};

/**
 * Expose
 */

module.exports = {
  development: extend(development, defaults),
  test: extend(test, defaults),
  production: extend(production, defaults)
}[cfg];
