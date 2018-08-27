// native modules
const path = require('path');
// 3rd party modules
const fs = require('fs-extra');
const nconf = require('nconf');

const getDefaultDb = () => {
  const url = process.env.MONGO_PORT_27017_TCP_ADDR || '127.0.0.1';
  const port = process.env.MONGO_PORT_27017_TCP_PORT || 27017;
  const collection = process.env.MONGO_PORT_27017_TCP_ADDR ? 'opentmi_dev' : 'opentmi_test';
  return `mongodb://${url}:${port}/${collection}`;
};

// read configurations
const args = {
  listen: {
    alias: 'l',
    type: 'string',
    describe: 'set binding interface',
    nargs: 1
  },
  https: {
    describe: 'use https',
    type: 'bool'
  },
  port: {
    describe: 'set listen port',
    type: 'number',
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
    type: 'bool',
    describe: 'Silent mode'
  },
  config: {
    alias: 'c',
    default: 'config.json',
    type: 'string',
    describe: 'config file'
  },
  db: {
    type: 'string',
    describe: 'mongodb connection string'
  },
  'auto-reload': {
    alias: 'r',
    type: 'bool',
    describe: 'Automatically restart workers when changes detected in server directory'
  }
};

const sampleFile = path.resolve(__dirname, '../../config.example.json');
const defaults = JSON.parse(fs.readFileSync(sampleFile));
defaults.db = getDefaultDb();
nconf
  .argv(args, 'Usage: npm start -- (options)')
  .env()
  .file(path.resolve(process.cwd(), nconf.get('config')))
  .defaults(defaults);

const cfgFileName = path.resolve(process.cwd(), nconf.get('config'));
if (!fs.existsSync(cfgFileName)) {
  fs.copyFileSync(sampleFile, cfgFileName);
}

module.exports = nconf;
