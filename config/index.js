const path = require('path');
const nconf = require('nconf');

// read configurations
const args = {
  listen: {
    alias: 'l',
    default: '0.0.0.0',
    type: 'string',
    describe: 'set binding interface',
    nargs: 1
  },
  https: {
    describe: 'use https',
    type: 'bool',
    default: false
  },
  port: {
    describe: 'set listen port',
    type: 'number',
    demand: true,
    default: 3000,
    nargs: 1
  },
  env: {
    alias: 'e',
    default: process.env.NODE_ENV || 'development',
    type: 'string',
    describe: 'Select environment (development,test,production)',
    nargs: 1
  },
  verbose: {
    alias: 'v',
    type: 'number',
    describe: 'verbose level',
    count: 'v'
  },
  silent: {
    alias: 's',
    default: false,
    type: 'bool',
    describe: 'Silent mode'
  },
  config: {
    alias: 'c',
    default: 'config.json',
    type: 'string',
    describe: 'config file'
  },
  'auto-reload': {
    alias: 'r',
    default: false,
    type: 'bool',
    describe: 'Automatically restart workers when changes detected in server directory'
  }
};

nconf
  .argv(args, 'Usage: npm start -- (options)')
  .env()
  .file(path.resolve(process.cwd(), nconf.get('config')))
  .defaults(require('./config.js'));

module.exports = nconf;
