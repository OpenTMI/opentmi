const testConfig = {
  name: 'OpenTMI-test',
  host: process.env.OPENTMI_BIND || '0.0.0.0',
  port: process.env.OPENTMI_PORT || 3000,
  webtoken: process.env.WEBTOKEN || 'OpenTMI-toP-SeCRet-tOKEn',
  db: process.env.MONGODB || 'mongodb://localhost/opentmi_test',
  filedb: process.env.FILE_DB || './test/test_filedb_data',
  admin: {
    user: process.env.OPENTMI_ADMIN_USERNAME || 'admin',
    pwd: process.env.OPENTMI_ADMIN_PASSWORD || 'admin'
  },
  ldap: {
    url: process.env.LDAP_URL
  },
  jenkins: {
    // url: 'my@host.jenkins.com/'
  },
  slack: {
    // token: 'my-token'
  },
  github: {
    clientID: process.env.GITHUB_CLIENTID,
    clientSecret: process.env.GITHUB_SECRET,
    callbackURL: process.env.GITHUB_CBURL || 'http://localhost:3000/auth/github/callback',
    organization: process.env.GITHUB_ORG,
    adminTeam: process.env.GITHUB_ADMINTEAM || 'admins'
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
module.exports = testConfig;
