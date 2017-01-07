'use strict';

// native modules
var fs = require('fs');
var http = require('http');
var EventEmitter = require('events').EventEmitter

// 3rd party modules
var express = require('express');
var winston = require('winston');
var nconf = require('nconf');

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
      default: 3000,
      nargs: 1
    },
    cfg: {
        alias: 'c',
        default: process.env.NODE_ENV || 'development',
        type: 'string',
        describe: 'Select configuration (development,test,production)',
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
  }, 'Usage: npm start -- (options)')
  .env()
  .defaults( require( './../config/config.js' ) );

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
winston.debug('Use cfg: %s', nconf.get('cfg'));

var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);

// Create public event channel
global.pubsub = new EventEmitter();

// Initialize database connetion
require('./db');

// Connect models
winston.info("Register models..");
fs.readdirSync(__dirname + '/models').forEach(function (file) {
  if (file.match(/\.js$/) && !file.match(/^\./)){
    winston.verbose(' * '+file);
    require(__dirname + '/models/' + file);
  }
});

// Bootstrap application settings
require('../config/express')(app);

// Bootstrap routes
winston.info("Add Routers..");
fs.readdirSync(__dirname + '/routes').forEach(function (file) {
  if ( file.match(/\.js$/) &&
      !file.match(/error\.js$/)) {
    winston.verbose(' * '+file);
    require(__dirname + '/routes/' + file)(app);
  }
});

// Bootsrap addons, like default webGUI
var AddonManager = require('./addons');
global.AddonManager = new AddonManager(app, server, io);
global.AddonManager.RegisterAddons();

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
  console.log('OpenTMI started on port ' + nconf.get('port') +' in '+nconf.get('cfg')+ ' mode');
};

server.listen(nconf.get('port'), nconf.get('listen'));
server.on('error', onError);
server.on('listening', onListening);

