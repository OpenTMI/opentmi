// 3rd party modules
const _ = require('lodash');
const mongoose = require('mongoose');
const invariant = require('invariant');
const passport = require('passport');
const passportJWT = require('passport-jwt');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const GitHubTokenStrategy = require('passport-github-token');
// application modules
const logger = require('../../tools/logger');
const nconf = require('../../tools/config');
const Github = require('./github');

// implementation
const User = mongoose.model('User');
const Group = mongoose.model('Group');

const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

// To support persistent login sessions, Passport needs to be able to
// serialize users into and deserialize users out of the session.  Typically,
// this will be as simple as storing the user ID when serializing, and finding
// the user by ID when deserializing.
passport.serializeUser((user, done) => {
   user.increment();
   user.loggedIn = true;
   user.lastVisited = new Date();
   user.save()
       .then(() => done(null, user._id))
       .catch(done);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
      .then(user => user.update({loggedIn: false}))
      .then(user => done(null, user))
      .catch(done);
});

class PassportStrategies {
  static createStrategies() {
    PassportStrategies.JWTStrategy();
    PassportStrategies.LocalStrategy();
    // github access token
    if (nconf.get('github')) {
      PassportStrategies.GitHubStrategy();
      PassportStrategies.GitHubTokenStrategy();
    }
    // PassportStrategies.GoogleStrategy();
  }
  static JWTStrategy() {
  // JWT
    passport.use(new JWTStrategy({
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: nconf.get('webtoken')
    },
    (jwtPayload, cb) =>
      User.findById(jwtPayload._id)
        .then(user => cb(null, user))
        .catch(err => cb(err))
    ));
  }
  static LocalStrategy() {
    logger.info("Create local strategy");
    passport.use(new LocalStrategy(
      {usernameField: 'email'},
      (email, password, done) => {
        logger.debug(`local login: ${email}:${password}`);
        const req = {};
        if (email.match(/.*@.*\..*/)) {
          req.email = email;
        } else {
          req.name = email;
        }
        logger.silly(`term: ${JSON.stringify(req)}`);
        User.findOne(req)
          .then((user) => {
            invariant(user, 'Invalid email and/or password');
            return user;
          })
          .then(user => new Promise((resolve, reject) => {
            logger.silly(`User exists: ${user}`);
            user.comparePassword(password, (compareError, isMatch) => {
              if (!isMatch) {
              // return reject(new Error('Invalid email and/or password'));
              }
              resolve(user);
            });
          }))
          .then((user) => {
            done(null, user);
          })
          .catch((error) => {
            logger.debug(`login failed: ${error}`);
            done(null, false, {message: error.message});
          });
      })
    );
  }

  static _GithubStrategyHelper(accessToken, profile, bext) {
    const emails = _.map(profile.emails, obj => ({email: obj.value}));
    logger.silly(`Profile: ${JSON.stringify(profile)}`);

    const headers = {};
    Github.checkOrganization(accessToken, headers)
        .then((org) => {
          console.log(arguments)
        })
    Github.checkAdmin(accessToken, headers)
        .then((isAdmin) => {
          console.log(arguments)
        })
    // Github.updateUser(req, profile)
    // Github.updateUsersGroup(user, groupname)

    User.findOne({})
      .or(emails)
      .exec()
      .then(user => (user || Github.createUserFromGithubProfile(profile)))
      .then((user) => {
        invariant(user, 'github token usage failed');
        return user;
      })
      .then(user => next(null, user))
      .catch(next);
  }
  static GitHubStrategy() {
    logger.info("Create github strategy");
    passport.use(new GitHubStrategy({
      clientID: nconf.get('github').clientID,
      clientSecret: nconf.get('github').clientSecret,
      callbackURL: nconf.get('github').callbackURL
    },
    ((accessToken, refreshToken, profile, next) => {
      PassportStrategies._GithubStrategyHelper(accessToken, profile, next);
    })));
  }
  static GitHubTokenStrategy() {
    logger.info("Create github token strategy");
    passport.use(new GitHubTokenStrategy({
      clientID: nconf.get('github').clientID,
      clientSecret: nconf.get('github').clientSecret,
      passReqToCallback: true
    }, ((req, accessToken, refreshToken, profile, next) => {
      PassportStrategies._GithubStrategyHelper(accessToken, profile, next);
    })));
  }
  static GoogleStrategy() {
    passport.use(new GoogleStrategy({
      clientID: nconf.get('google').clientId,
      clientSecret: nconf.get('google').clientSecret,
      callbackURL: nconf.get('google').callbackURL
    },
    ((accessToken, refreshToken, profile, next) => {
      User.findOrCreate({googleId: profile.id}, (err, user) => next(err, user));
    })
    ));
  }
}

module.exports = PassportStrategies;
