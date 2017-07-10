'use strict';

// native modules
var fs = require('fs');
var http = require('http');
var https = require('https');
var EventEmitter = require('events').EventEmitter

// 3rd party modules
var express = require('express');
var logger = require('winston');
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

// Define logger behaviour
logger.cli(); // activates colors

// define console logging level
logger.level = ['info', 'debug', 'verbose', 'silly'][nconf.get('verbose') % 4];

// Add winston file logger, which rotates daily
var fileLevel = 'silly';
logger.add(require('winston-daily-rotate-file'), {
  filename: 'log/app.log',
  json: false,
  handleExceptions: false,
  level: fileLevel,
  datePatter: '.yyyy-MM-dd_HH-mm'
});
logger.debug('Using cfg: %s', nconf.get('cfg'));

var app = express();
/**
 * Create HTTP server.
 */
var server;
var sslcert_key = 'sslcert/server.key';
var sslcert_crt = 'sslcert/server.crt';
if( nconf.get('https') ) {
    if( !fs.existsSync(sslcert_key) ) {
        logger.error('ssl cert key is missing: %s', sslcert_key);
        process.exit(1);
    }
    if( !fs.existsSync(sslcert_crt) ) {
        logger.error('ssl cert crt is missing: %s', sslcert_crt);
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
logger.info("Register models..");
fs.readdirSync(__dirname + '/models').forEach(function (file) {
  if (file.match(/\.js$/) && !file.match(/^\./)){
    logger.verbose(' * '+file);
    require(__dirname + '/models/' + file);
  }
});

// Bootstrap application settings
require('../config/express')(app);

// Bootstrap routes
logger.info("Add Routers..");
fs.readdirSync(__dirname + '/routes').forEach(function (file) {
  if ( file.match(/\.js$/) &&
      !file.match(/error\.js$/)) {
    logger.verbose(' * '+file);
    require(__dirname + '/routes/' + file)(app);
  }
});

// Bootsrap addons, like default webGUI
var AddonManager = require('./addons');
global.AddonManager = new AddonManager(app, server, io);
global.AddonManager.loadAddons().then(() => {
  global.AddonManager.registerAddons().then(() => {
    // Add error router
    require(__dirname + '/routes/error.js')(app);

    var onError = function(error){
      if( error.code === 'EACCES' && nconf.get('port') < 1024 ) {
        logger.error("You haven't access to open port below 1024");
        logger.error("Please use admin rights if you wan't to use port %d!", nconf.get('port'));
      } else {
        logger.error(error);
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
  });
});
