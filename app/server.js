// native modules
const fs = require('fs');
const http = require('http');
const https = require('https');

// application
const logger = require('./tools/logger');
const nconf = require('../config');

const sslcertKey = './config/sslcert/server.key';
const sslcertCrt = './config/sslcert/server.crt';

function createServer(app) {
  if (nconf.get('https')) {
    if (!fs.existsSync(sslcertKey)) {
      logger.error('ssl cert key is missing: %s', sslcertKey);
      process.exit(1);
    }
    if (!fs.existsSync(sslcertCrt)) {
      logger.error('ssl cert crt is missing: %s', sslcertCrt);
      process.exit(1);
    }
    const key = fs.readFileSync(sslcertKey);
    const cert = fs.readFileSync(sslcertCrt);
    const options = {key, cert};
    return https.createServer(options, app);
  }

  return http.createServer(app);
}

module.exports = createServer;
