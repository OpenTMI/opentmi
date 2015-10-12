var fs = require('fs');
var http = require('http');
var EventEmitter = require('events').EventEmitter

var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');
var winston = require('winston');
var nconf = require('nconf');

var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);


global.pubsub = new EventEmitter();

nconf.argv()
   .env()
   .defaults( require( './../config/config.js' ) );


winston.add(winston.transports.DailyRotateFile, {
    filename: 'log/app.log',
    json: false,
    handleExceptions: false,
    datePatter: '.yyyy-MM-dd_HH-mm'
  });


// Connect to mongodb
var connect = function () {
  var options = { server: { socketOptions: { keepAlive: 1 } } };
  mongoose.connect(nconf.get('db'), options);
};
mongoose.connection.on('error', function(error){
  winston.error(error.toString());
});
mongoose.connection.on('disconnected', function(){
    winston.error('disconnected');
    setTimeout( connect, 1000 );
});

connect();

fs.readdirSync(__dirname + '/models').forEach(function (file) {
  if (file.indexOf('.js$')){
    winston.info('-RegisterModel: '+file);
    require(__dirname + '/models/' + file);
  }
});

// Bootstrap passport config
require('../config/passport')(passport, nconf.get());


// Bootstrap application settings
require('../config/express')(app, passport);

// Bootstrap routes
fs.readdirSync(__dirname + '/routes').forEach(function (file) {
  if ( file.match(/\.js$/) && 
      !file.match(/error\.js$/)) {
    winston.info('-AddRoute: '+file);
    require(__dirname + '/routes/' + file)(app, passport);
  }
});

var Addons = require('./addons');
GLOBAL.AddonManager = new Addons(app, server, io, passport);
GLOBAL.AddonManager.RegisterAddons();


require(__dirname + '/routes/error.js')(app, passport);

server.listen(nconf.get('port'), function(){
  winston.info('TMT started on port ' + nconf.get('port') +' in '+process.env.NODE_ENV+ ' mode');
});