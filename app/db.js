var winston = require('winston');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var nconf = require('nconf');
const dbUrl = nconf.get('db');

var isConnectedBefore = false;
var connect = function() {
    var options = { server: { 
                        socketOptions: { keepAlive: 1 },
                        auto_reconnect: true } };
    mongoose.connect(dbUrl, options);
};

mongoose.connection.on('error', function() {
    winston.error('Could not connect to MongoDB: ' + dbUrl);
});

mongoose.connection.on('disconnected', function(){
    winston.warn('Lost MongoDB connection...');
    if (!isConnectedBefore)
        connect();
});
mongoose.connection.on('connected', function() {
    isConnectedBefore = true;
    winston.info('Connection established to MongoDB: ' + dbUrl);
});

mongoose.connection.on('reconnected', function() {
    winston.info('Reconnected to MongoDB: ' + dbUrl);
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