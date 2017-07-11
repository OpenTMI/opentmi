const logger = require('winston');
const mongoose = require('mongoose');
const Promise = require('bluebird');
mongoose.Promise = Promise;

const nconf = require('../config');
const dbUrl = nconf.get('db');

const connect = function() {
    var options = {
        server: {
            socketOptions: { keepAlive: 1 },
            auto_reconnect: true
        }
    };
    /** @todo figure out valid configurations
    const options = {
        useMongoClient: true,
        keepAlive: 120,
        autoReconnect: true,
        logger: logger,
        loggerLevel: 'warning'
    };*/
    logger.info(`Create MongoDB connection: ${dbUrl}`);
    mongoose.connect(dbUrl, options);
};

mongoose.connection.on('error', () => {
    logger.error('Could not connect to MongoDB: ' + dbUrl);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost, try again');
    connect();
});
mongoose.connection.on('connected', () => {
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
