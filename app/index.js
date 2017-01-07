'use strict';

// native modules
var fs = require('fs');
var http = require('http');
var https = require('https');
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
    https: {
      describe: 'use https',
      type: 'bool',
      default: false
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
/**
 * Create HTTP server.
 */
var server;
var sslcert_key = 'sslcert/server.key';
var sslcert_crt = 'sslcert/server.crt';
if( nconf.get('https') ) {
    if( !fs.existsSync(sslcert_key) ) {
        winston.error('ssl cert key is missing: %s', sslcert_key);
        process.exit(1);
    }
    if( !fs.existsSync(sslcert_crt) ) {
        winston.error('ssl cert crt is missing: %s', sslcert_crt);
        process.exit(1);
    }
    var privateKey = fs.readFileSync(sslcert_key);
    var certificate = fs.readFileSync(sslcert_crt);
    var credentials = {key: privateKey, cert: certificate};
    server = https.createServer(credentials, app);
} else {
    server = http.createServer(app);
}

var io = require('socket.io')(server);

// Create public event channel
global.pubsub = new EventEmitter();

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
  var listenurl = (nconf.get('https')?'https':'http:')+'://'+nconf.get('listen')+':'+nconf.get('port');
  console.log('OpenTMI started on ' +listenurl+ ' in '+ nconf.get('cfg')+ ' mode');
};

server.listen(nconf.get('port'), nconf.get('listen'));
server.on('error', onError);
server.on('listening', onListening);
