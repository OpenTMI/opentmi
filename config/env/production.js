
/**
 * Expose
 */

module.exports = {
  db: 'mongodb://localhost/opentmi_prod',
  port: 80,
  ldap: {
    url: process.env.LDAP_URL
  },
  webtoken:'OpenTMI-toP-SeCRet-tOKEn',
  email_doman: process.env.EMAIL_DOMAIN,
  admin: {
    //default values
    'user': 'admin',
    'pwd': 'admin',
  },
  filedb: process.env.FILE_DB || './data',
  facebook: {
    clientID: process.env.FACEBOOK_CLIENTID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://nodejs-express-demo.herokuapp.com/auth/facebook/callback"
  },
  twitter: {
    clientID: process.env.TWITTER_CLIENTID,
    clientSecret: process.env.TWITTER_SECRET,
    callbackURL: "http://nodejs-express-demo.herokuapp.com/auth/twitter/callback"
  },
  github: {
    clientID: process.env.GITHUB_CLIENTID,
    clientSecret: process.env.GITHUB_SECRET,
    callbackURL: process.env.GITHUB_CBURL,
    organization: process.env.GITHUB_ORG,
    adminTeam: process.env.GITHUB_ADMINTEAM || 'admins',
  },
  linkedin: {
    clientID: process.env.LINKEDIN_CLIENTID,
    clientSecret: process.env.LINKEDIN_SECRET,
    callbackURL: 'http://nodejs-express-demo.herokuapp.com/auth/linkedin/callback'
  },
  google: {
    clientID: process.env.GOOGLE_CLIENTID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: "http://nodejs-express-demo.herokuapp.com/auth/google/callback"
  }
};
