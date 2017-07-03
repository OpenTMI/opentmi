var logger = require('winston');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const nconf = require('../config');
const dbUrl = nconf.get('db');

var isConnectedBefore = false;
var connect = function() {
    var options = { server: { 
                        socketOptions: { keepAlive: 1 },
                        auto_reconnect: true } };
    mongoose.connect(dbUrl, options);
};

mongoose.connection.on('error', function() {
    logger.error('Could not connect to MongoDB: ' + dbUrl);
});

mongoose.connection.on('disconnected', function(){
    logger.warn('Lost MongoDB connection...');
    if (!isConnectedBefore)
        connect();
});
mongoose.connection.on('connected', function() {
    isConnectedBefore = true;
    logger.info('Connection established to MongoDB: ' + dbUrl);
});

mongoose.connection.on('reconnected', function() {
    logger.info('Reconnected to MongoDB: ' + dbUrl);
});

// Close the Mongoose connection, when receiving SIGINT
process.on('SIGINT', function() {
    mongoose.connection.close(function () {
        console.log('Force to close the MongoDB conection: ' + dbUrl);
        process.exit(0);
    });
});

// Connect to mongodb
connect();