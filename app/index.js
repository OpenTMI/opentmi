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
    listen: {
        alias: 'l',
        default: '0.0.0.0',
        type: 'string',
        describe: 'set binding interface',
        nargs: 1
    },
    port: {
      describe: 'set listen port',
      type: 'number',
      demand: true,
      default: defaultConfigs.port,
      nargs: 1
    },
    verbose: {
        alias: 'v',
        type: 'number',
        describe: 'verbose level',
        count: 'v'
    },
    silent: {
        alias: 's',
        default: false,
        type: 'bool',
        describe: 'Silent mode'
    }
  }, 'Usage: npm start')
  .env()
  .defaults( defaultConfigs );

if (nconf.get('help') || nconf.get('h')) {
  return nconf.stores.argv.showHelp()
}


var fileLevel = 'silly';
var consoleLevel = 'info';
if (nconf.get('verbose') >= 1) { consoleLevel = 'verbose'; }
if (nconf.get('verbose') >= 2) { consoleLevel = 'debug'; }
if (nconf.get('verbose') >= 3) { consoleLevel = 'silly'; }
if (nconf.get('silent')) { consoleLevel = 'error'; }
winston.level = consoleLevel;
// Add winston file logger, which rotate daily
winston.add(require('winston-daily-rotate-file'), {
  filename: 'log/app.log',
  json: false,
  handleExceptions: false,
  level: fileLevel,
  datePatter: '.yyyy-MM-dd_HH-mm'
});
winston.debug('Use cfg: %s', defaultConfigs.cfg);

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

var onError = function(error){
  if( error.code === 'EACCES' && nconf.get('port') < 1024 ) {
    winston.error("You haven't access to open port below 1024");
    winston.error("Please use admin rights if you wan't to use port %d!", nconf.get('port'));
  } else {
    winston.error(error);
  }
  process.exit(-1);
};
var onListening = function(){
  console.log('OpenTMI started on port ' + nconf.get('port') +' in '+process.env.NODE_ENV+ ' mode');
};

server.listen(nconf.get('port'), nconf.get('listen'));
server.on('error', onError);
server.on('listening', onListening);

