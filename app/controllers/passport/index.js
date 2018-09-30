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

const TOKEN_SECRET = nconf.get('webtoken');
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

// To support persistent login sessions, Passport needs to be able to
// serialize users into and deserialize users out of the session.  Typically,
// this will be as simple as storing the user ID when serializing, and finding
// the user by ID when deserializing.
passport.serializeUser((userDoc, done) => {
  const doc = userDoc;
  doc.increment();
  doc.loggedIn = true;
  doc.lastVisited = new Date();
  doc.save()
    .then(user => done(null, user))
    .catch(done);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => user.update({loggedIn: false}))
    .then(() => done(null, id))
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
      secretOrKey: TOKEN_SECRET,
      passReqToCallback: true
    },
    (req, jwtPayload, cb) => {
      req.decoded_token = jwtPayload;
      logger.silly(`Check user: ${jwtPayload._id}`);
      User.findById(jwtPayload._id)
        .then((user) => {
          if (!user) {
            logger.warn(`User not found with id: ${jwtPayload._id}`);
          }
          cb(null, user);
        })
        .catch((error) => {
          logger.warn(`User.findById throws: ${error}`);
          cb(error);
        });
    }));
  }
  static LocalStrategy() {
    logger.info('Create local strategy');
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
          .select('_id name email groups apikeys +password')
          .exec()
          .then((user) => {
            invariant(user, 'Invalid email and/or password');
            return user;
          })
          .then(user => user.comparePassword(password).return(user))
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

  static _GithubStrategyHelper(oauth2, accessToken, profile, next) {
    const emails = _.map(profile.emails, obj => ({email: obj.value}));
    logger.silly(`Profile: ${JSON.stringify(profile)}`);
    Github.checkOrganization(oauth2, accessToken)
      .then(() => Github.checkAdmin(oauth2, accessToken))
      .then((isAdmin) => {
        const group = isAdmin ? 'admins' : 'users';
        return User.findOne({})
          .or(emails)
          .exec()
          .then((user) => {
            if (!user) {
              return Github.createUserFromGithubProfile(profile);
            }
            user.github = profile.login; // eslint-disable-line no-param-reassign
            user.picture = user.picture || _.get(profile, 'photos.0.value'); // eslint-disable-line no-param-reassign
            user.displayName = user.displayName || profile.name; // eslint-disable-line no-param-reassign
            user.name = user.displayName; // eslint-disable-line no-param-reassign
            user.email = _.get(profile, 'emails.0.value'); // eslint-disable-line no-param-reassign
            return Github.updateUsersGroup(user, group)
              .return(user);
          })
          .then(user => next(null, user));
      }
      )
      .catch(next);
  }
  static GitHubStrategy() {
    logger.info('Create github strategy');
    const strategy = new GitHubStrategy({
      clientID: nconf.get('github').clientID,
      clientSecret: nconf.get('github').clientSecret,
      callbackURL: nconf.get('github').callbackURL
    },
    ((accessToken, refreshToken, profile, next) => {
      const oauth2 = strategy._oauth2;
      PassportStrategies._GithubStrategyHelper(oauth2, accessToken, profile, next);
    }));
    passport.use(strategy);
  }
  static GitHubTokenStrategy() {
    logger.info('Create github token strategy');
    const {clientID, clientSecret} = nconf.get('github');
    const strategy = new GitHubTokenStrategy({clientID, clientSecret},
      ((accessToken, refreshToken, profile, next) => {
        const oauth2 = strategy._oauth2;
        PassportStrategies._GithubStrategyHelper(oauth2, accessToken, profile, next);
      }));
    passport.use(strategy);
  }
  static GoogleStrategy() {
    const {clientID, clientSecret, callbackURL} = nconf.get('google');
    passport.use(new GoogleStrategy({clientID, clientSecret, callbackURL},
      ((accessToken, refreshToken, profile, next) => {
        // @todo this might not working yet..
        User.findOrCreate({googleId: profile.id}, (err, user) => next(err, user));
      })
    ));
  }
}

module.exports = PassportStrategies;
