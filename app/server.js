// native modules
const fs = require('fs');
const http = require('http');
const https = require('https');

// application
const logger = require('winston');
const nconf = require('../config');
const sslcert_key = '../config/sslcert/server.key';
const sslcert_crt = '../config/sslcert/server.crt';

function createServer(app) {
  if( nconf.get('https') ) {
      if (!fs.existsSync(sslcert_key)) {
          logger.error('ssl cert key is missing: %s', sslcert_key);
          process.exit(1);
      }
      if (!fs.existsSync(sslcert_crt)) {
          logger.error('ssl cert crt is missing: %s', sslcert_crt);
          process.exit(1);
      }
      const key = fs.readFileSync(sslcert_key);
      const cert = fs.readFileSync(sslcert_crt);
      const options = {key, cert};
      return https.createServer(options, app);
  } else {
      return http.createServer(app);
  }
}

module.exports = createServer;
