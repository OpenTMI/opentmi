var fs = require('fs');
var http = require('http');

var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');
var winston = require('winston');

var config = require('./../config/config.js');

var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);
var port = 3000;

winston.add(winston.transports.DailyRotateFile, {
    filename: 'log/app.log',
    json: false,
    handleExceptions: true,
    datePatter: '.yyyy-MM-dd_HH-mm'
  });


// Connect to mongodb
var connect = function () {
  var options = { server: { socketOptions: { keepAlive: 1 } } };
  mongoose.connect(config.db);
};

connect();

mongoose.connection.on('error', function(error){
  setTimeout( connect, 1000 );
});
mongoose.connection.on('disconnected', connect);

fs.readdirSync(__dirname + '/models').forEach(function (file) {
  if (file.indexOf('.js$')){
    winston.info('-RegisterModel: '+file);
    require(__dirname + '/models/' + file);
  }
});

// Bootstrap passport config
require('../config/passport')(passport, config);


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

server.listen(port, function(){
  winston.info('TMT started on port ' + port);
});