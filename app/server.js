// native modules
const fs = require('fs');
const http = require('http');
const https = require('https');

// application
const logger = require('./tools/logger');
const config = require('./tools/config');

const sslcertKey = config.get('sslcertKey');
const sslcertCrt = config.get('sslcertCrt');

function createServer(app) {
  if (config.get('https')) {
    if (!fs.existsSync(sslcertKey)) {
      logger.error(`ssl cert key is missing: ${sslcertKey}`);
      process.exit(1);
    }
    if (!fs.existsSync(sslcertCrt)) {
      logger.error(`ssl cert crt is missing: ${sslcertCrt}`);
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
