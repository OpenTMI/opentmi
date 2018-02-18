const logger = require('./tools/logger');
const mongoose = require('mongoose');
const Promise = require('bluebird');

const nconf = require('../config');

const dbUrl = nconf.get('db');
mongoose.Promise = Promise;

let tearingDown = false;

const connect = function () {
  const options = {
    logger: logger.info.bind(logger),
    loggerLevel: 'info' // @todo fetch from config file
  };

  logger.info(`Connecting to MongoDB: ${dbUrl}`);
  return mongoose
    .connect(dbUrl, options);
};

const close = Promise.promisify(mongoose.connection.close.bind(mongoose.connection));
function disconnect() {
  tearingDown = true;
  logger.info(`Force to close the MongoDB connection: ${dbUrl}`);
  return close();
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
  connect,
  disconnect,
  mongoose
};
