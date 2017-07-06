'use strict';

// native modules
const fs = require('fs');
const http = require('http');
const https = require('https');

// 3rd party modules
const express = require('express');
const logger = require('winston');
const args = require('./tools/arguments');
const eventBus = require('./tools/eventBus');

// application modules
const models = require('./models');
const routes = require('./routes');

var fileLevel = 'silly';
var consoleLevel = 'info';
if (args.get('verbose') >= 1) { consoleLevel = 'verbose'; }
if (args.get('verbose') >= 2) { consoleLevel = 'debug'; }
if (args.get('verbose') >= 3) { consoleLevel = 'silly'; }
if (args.get('silent')) { consoleLevel = 'error'; }
logger.level = consoleLevel;
// Add winston file logger, which rotate daily
logger.add(require('winston-daily-rotate-file'), {
  filename: 'log/app.log',
  json: false,
  handleExceptions: false,
  level: fileLevel,
  datePatter: '.yyyy-MM-dd_HH-mm'
});
logger.debug('Use cfg: %s', args.get('cfg'));

var app = express();
/**
 * Create HTTP server.
 */
var server;
var sslcert_key = 'sslcert/server.key';
var sslcert_crt = 'sslcert/server.crt';
if( args.get('https') ) {
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

// Initialize database connetion
require('./db');

// Connect models
models.registerModels();

// Bootstrap application settings
require('../config/express')(app);

// Bootstrap routes
routes.registerRoutes(app);

// Bootsrap addons, like default webGUI
var AddonManager = require('./addons');
global.AddonManager = new AddonManager(app, server, io);
global.AddonManager.RegisterAddons();

// Add final route for error
routes.registerErrorRoute(app);

var onError = function(error){
  if( error.code === 'EACCES' && args.get('port') < 1024 ) {
    logger.error("You haven't access to open port below 1024");
    logger.error("Please use admin rights if you wan't to use port %d!", args.get('port'));
  } else {
    logger.error(error);
  }
  process.exit(-1);
};
var onListening = function(){
  var listenurl = (args.get('https')?'https':'http:')+'://'+args.get('listen')+':'+args.get('port');
  console.log('OpenTMI started on ' +listenurl+ ' in '+ args.get('cfg')+ ' mode');
  eventBus.emit('start_listening', {url: listenurl});
};

server.listen(args.get('port'), args.get('listen'));
server.on('error', onError);
server.on('listening', onListening);
