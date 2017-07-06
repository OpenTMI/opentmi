const logger = require('winston');
const mongoose = require('mongoose');
const Promise = require('bluebird');
mongoose.Promise = Promise;

const nconf = require('../config');
const dbUrl = nconf.get('db');

let isConnectedBefore = false;

const connect = function() {
    const options = {
        useMongoClient: true,
        socketOptions: { keepAlive: 1 },
        auto_reconnect: true
    };
    logger.warn('Create MongoDB connection..');
    mongoose.connect(dbUrl, options);
};

mongoose.connection.on('error', () => {
    logger.error('Could not connect to MongoDB: ' + dbUrl);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost');
    if (!isConnectedBefore) {
        connect();
    }
});
mongoose.connection.on('connected', () => {
    isConnectedBefore = true;
    logger.info('Connection established to MongoDB: ' + dbUrl);
});

mongoose.connection.on('reconnected', () => {
    logger.info('Reconnected to MongoDB: ' + dbUrl);
});

const close = Promise.promisify(mongoose.connection.close.bind(mongoose.connection));
function disconnect() {
    logger.info(`Force to close the MongoDB connection: ${dbUrl}`);
    return close();
}

module.exports = {
    connect,
    disconnect,
    mongoose
};
