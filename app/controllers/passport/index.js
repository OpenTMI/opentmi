const _ = require('lodash');
const mongoose = require('mongoose');
const invariant = require('invariant');
const passport = require('passport');
const passportJWT = require('passport-jwt');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const GitHubTokenStrategy = require('passport-github-token');


const logger = require('../../tools/logger');
const nconf = require('../../tools/config');

const User = mongoose.model('User');
const Group = mongoose.model('Group');

const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const githubAdminTeam = nconf.get('github').adminTeam;
const githubOrganization = nconf.get('github').organization;

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, done);
});

class PassportStrategies {
  static createStrategies() {
    AuthenticationController.JWTStrategy();
    AuthenticationController.LocalStrategy();
    // github access token
    if (nconf.get('github')) {
      AuthenticationController.GitHubStrategy();
      AuthenticationController.GitHubTokenStrategy();
    }
    // AuthenticationController.GoogleStrategy();
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
  static createUserFromGithubProfile(profile) {
    logger.silly(`create new user from github profile: ${profile.login}`);
    const newUser = new User();
    newUser.name = profile.displayName;
    newUser.github = profile._json.username;
    newUser.picture = profile._json.avatar_url;
    newUser.displayName = profile.displayName;
    newUser.email = profile._json.email;
    return newUser.save();
  }
  static GitHubStrategy() {
    logger.info("Create github strategy");
    passport.use(new GitHubStrategy({
      clientID: nconf.get('github').clientID,
      clientSecret: nconf.get('github').clientSecret,
      callbackURL: nconf.get('github').callbackURL
    },
    ((accessToken, refreshToken, profile, next) => {
      User.findOrCreate({githubId: profile.id}, (err, user) => done(err, next));
    })));
  }
  static GitHubTokenStrategy() {
    logger.info("Create github token strategy");
    passport.use(new GitHubTokenStrategy({
      clientID: nconf.get('github').clientID,
      clientSecret: nconf.get('github').clientSecret,
      passReqToCallback: true
    }, ((req, accessToken, refreshToken, profile, next) => {
      const emails = _.map(profile.emails, obj => ({email: obj.value}));
      logger.verbose(`Profile: ${JSON.stringify(profile)}`);
      User.findOne({})
        .or(emails)
        .exec()
        .then(user => (user || AuthenticationController.createUserFromGithubProfile(profile)))
        .then((user) => {
          invariant(user, 'github token usage failed');
          return user;
        })
        .then(user => next(null, user))
        .catch(next);
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
