/*!
 * Module dependencies.
 */
const fs = require('fs');
const path = require('path');

let env = {};
const envFile = path.join(__dirname, 'env.json');

// Read env.json file, if it exists, load the id's and secrets from that
// Note that this is only in the development env
// it is not safe to store id's in files

if (fs.existsSync(envFile)) {
  env = fs.readFileSync(envFile, 'utf-8');
  env = JSON.parse(env);
  Object.keys(env).forEach((key) => {
    process.env[key] = env[key];
  });
}

const developmentConfig = {
  name: 'OpenTMI-dev',
  host: process.env.OPENTMI_BIND || '0.0.0.0',
  port: process.env.OPENTMI_PORT || 3000,
  webtoken: process.env.WEBTOKEN || 'OpenTMI-toP-SeCRet-tOKEn',
  db: process.env.MONGODB || 'mongodb://localhost/opentmi_dev',
  admin: {
    // default values
    user: 'admin',
    pwd: 'admin'
  },
  filedb: process.env.FILE_DB || './data',
  ldap: {
    url: process.env.LDAP_URL
  },
  jenkins: {
    // url: 'my@host.jenkins.com/'
  },
  slack: {
    // token: 'my-token'
  },
  facebook: {
    clientID: process.env.FACEBOOK_CLIENTID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: 'http://localhost:3000/auth/facebook/callback'
  },
  twitter: {
    clientID: process.env.TWITTER_CLIENTID,
    clientSecret: process.env.TWITTER_SECRET,
    callbackURL: 'http://localhost:3000/auth/twitter/callback'
  },
  github: {
    clientID: process.env.GITHUB_CLIENTID,
    clientSecret: process.env.GITHUB_SECRET,
    callbackURL: process.env.GITHUB_CBURL || 'http://localhost:3000/auth/github/callback',
    organization: process.env.GITHUB_ORG,
    adminTeam: process.env.GITHUB_ADMINTEAM || 'admins'
  },
  linkedin: {
    clientID: process.env.LINKEDIN_CLIENTID,
    clientSecret: process.env.LINKEDIN_SECRET,
    callbackURL: 'http://localhost:3000/auth/linkedin/callback'
  },
  google: {
    clientID: process.env.GOOGLE_CLIENTID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback'
  }
};

/**
 * Expose
 */
module.exports = developmentConfig;
