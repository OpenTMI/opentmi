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

var defaultConfigs = require( './../config/config.js' );
// read configurations
nconf.argv({
    port: {
      describe: 'set listen port',
      type: 'number',
      demand: true,
      default: defaultConfigs.port
    }
  })
   .env()
   .defaults( defaultConfigs );
// Add winston file logger, which rotate daily
winston.add(require('winston-daily-rotate-file'), {
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

var listenPort = nconf.get('port');
server.on('error', function(error){
  if( error.code === 'EACCES' && listenPort < 1024 ) {
    winston.error("You haven't access to open port below 1024. Please use admin rights if you wan't to use port %d!", listenPort);
  } else {
    winston.error(error);
  }
  process.exit(-1);
});

// Start listen socket
server.listen(listenPort, function(){
  winston.info('TMT started on port ' + nconf.get('port') +' in '+process.env.NODE_ENV+ ' mode');
});