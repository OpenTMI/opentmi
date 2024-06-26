const mongoose = require('mongoose');
const Promise = require('bluebird');
const _ = require('lodash');
const {MongoMemoryServer} = require('mongodb-memory-server');

const logger = require('./tools/logger');
const config = require('./tools/config');

let dbUrl = config.get('db');
const dbOptions = config.get('mongo') || {};
mongoose.Promise = Promise;

let mongoServer = null;
let tearingDown = false;

const initialize = async function () {
  if (dbUrl === 'inmemory') {
    mongoServer = await MongoMemoryServer.create();
    dbUrl = mongoServer.getUri();
    logger.info(`use inmemory db: ${dbUrl}`);
    config.set('db', dbUrl);
  }
};

const connect = async function () {
  const must = {
    logger: logger.info.bind(logger),
    useNewUrlParser: true,
    useUnifiedTopology: true
  };
  const overwritable = {
    appname: 'opentmi',
    loggerLevel: 'info'
  };
  const options = _.merge(overwritable, dbOptions, must);

  logger.info(`Connecting to MongoDB: ${dbUrl}`);
  return mongoose
    .connect(dbUrl, options);
};

const close = Promise.promisify(mongoose.connection.close.bind(mongoose.connection));
async function disconnect() {
  tearingDown = true;
  logger.info(`Force to close the MongoDB connection: ${dbUrl}`);
  await close();
  if (mongoServer) {
    mongoServer.stop();
  }
}

mongoose.connection.on('error', (error) => {
  logger.error(`MongoDB connection error: ${error.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn(`MongoDB disconnected: ${dbUrl}`);

  // If not tearingDown, immediately try to reconnect
  if (!tearingDown) {
    logger.info('Retrying mongoDB connection...');
  }
});

mongoose.connection.on('connected', () => {
  logger.info(`Connected to MongoDB: ${dbUrl}`);
});

mongoose.connection.on('reconnected', () => {
  logger.info(`Reconnected to MongoDB: ${dbUrl}`);
});

module.exports = {
  initialize,
  connect,
  disconnect,
  mongoose
};
