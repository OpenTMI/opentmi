'use strict';

var fs = require('fs');
var http = require('http');
var EventEmitter = require('events').EventEmitter

var express = require('express');
var winston = require('winston');
var nconf = require('nconf');

var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);

// Create public event channel
global.pubsub = new EventEmitter();

// read configurations
nconf.argv()
   .env()
   .defaults( require( './../config/config.js' ) );

// Add winston file logger, which rotate daily
winston.add(winston.transports.DailyRotateFile, {
    filename: 'log/app.log',
    json: false,
    handleExceptions: false,
    datePatter: '.yyyy-MM-dd_HH-mm'
  });

// Initialize database connetion
require('./db');

// Connect models
fs.readdirSync(__dirname + '/models').forEach(function (file) {
  if (file.match(/\.js$/) && !file.match(/^\./)){
    winston.info('-RegisterModel: '+file);
    require(__dirname + '/models/' + file);
  }
});

// Bootstrap application settings
require('../config/express')(app);

// Bootstrap routes
fs.readdirSync(__dirname + '/routes').forEach(function (file) {
  if ( file.match(/\.js$/) && 
      !file.match(/error\.js$/)) {
    winston.info('-AddRoute: '+file);
    require(__dirname + '/routes/' + file)(app);
  }
});

// Bootsrap addons, like default webGUI
var AddonManager = require('./addons');
GLOBAL.AddonManager = new AddonManager(app, server, io);
GLOBAL.AddonManager.RegisterAddons();

// Add error router
require(__dirname + '/routes/error.js')(app);

// Start listen socket
server.listen(nconf.get('port'), function(){
  winston.info('TMT started on port ' + nconf.get('port') +' in '+process.env.NODE_ENV+ ' mode');
});