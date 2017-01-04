
/**
 * Expose
 */

module.exports = {
  db: 'mongodb://localhost/tmt_test',
  port: 3000,
  ldap: {
    url: process.env.LDAP_URL
  },
  webtoken:'OpenTMI-toP-SeCRet-tOKEn',
  admin: {
    //default values
    'user': 'admin',
    'pwd': 'admin'
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
    callbackURL: process.env.GITHUB_CBURL || 'http://localhost:3000/auth/github/callback',
    organization: process.env.GITHUB_ORG,
    authentication: {
        type: "oauth",
        token: process.env.GITHUB_TOKEN
    },
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
    callbackURL: "http://localhost:3000/auth/google/callback"
  }
};
