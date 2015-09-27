/*!
 * Module dependencies.
 */

var fs = require('fs');
var env = {};
var envFile = __dirname + '/env.json';

// Read env.json file, if it exists, load the id's and secrets from that
// Note that this is only in the development env
// it is not safe to store id's in files

if (fs.existsSync(envFile)) {
  env = fs.readFileSync(envFile, 'utf-8');
  env = JSON.parse(env);
  Object.keys(env).forEach(function (key) {
    process.env[key] = env[key];
  });
}

/**
 * Expose
 */

module.exports = {
  db: 'mongodb://localhost/tmt_dev',
  port: 3000,
  ldap: {
    url: process.env.LDAP_URL
  },
  jenkins: {
    url: 'https://jupe:420432eb1ed713e5ede49107c858fd14@jenkins-internal.mbed.com/'
  },
  slack: {
    token: 'xoxp-2987443183-9694241206-10619586020-44aa8be661'
  },
  facebook: {
    clientID: process.env.FACEBOOK_CLIENTID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  twitter: {
    clientID: process.env.TWITTER_CLIENTID,
    clientSecret: process.env.TWITTER_SECRET,
    callbackURL: "http://localhost:3000/auth/twitter/callback"
  },
  github: {
    clientID: process.env.GITHUB_CLIENTID,
    clientSecret: process.env.GITHUB_SECRET,
    callbackURL: 'http://localhost:3000/auth/github/callback',
    authentication: {
      type: 'oauth',
      token: '8690ce99ff8d0243b0ecc491995ebe0937ee5199'
    }
  },
  linkedin: {
    clientID: process.env.LINKEDIN_CLIENTID,
    clientSecret: process.env.LINKEDIN_SECRET,
    callbackURL: 'http://localhost:3000/auth/linkedin/callback'
  },
  google: {
    clientID: process.env.GOOGLE_CLIENTID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  }
};
