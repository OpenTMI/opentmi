
/**
 * Module dependencies.
 */
var path = require('path');
var extend = require('util')._extend;

var winston = require('winston');

var development = require('./env/development');
var test = require('./env/test');
var production = require('./env/production');


var defaults = {
  root: path.normalize(__dirname + '/..')
};

/**
 * Expose
 */
var cfg = process.env.NODE_ENV || 'development';
console.log('use cfg: %s', cfg);
module.exports = {
  development: extend(development, defaults),
  test: extend(test, defaults),
  production: extend(production, defaults)
}[cfg];
