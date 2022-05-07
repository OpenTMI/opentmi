// 3rd party modules
const _ = require('lodash');
const mongoose = require('mongoose');
const invariant = require('invariant');
const passport = require('passport');
const passportJWT = require('passport-jwt');
const HttpStrategy = require('passport-http').BasicStrategy;
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
    .then((user) => done(null, user))
    .catch(done);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => {
      if (user) {
        return user.update({loggedIn: false});
      }
      logger.warn(`deserialize user that does not found with id: ${id.toString()}`);
      return Promise.resolve();
    })
    .then(() => done(null, id))
    .catch(done);
});

class PassportStrategies {
  static createStrategies() {
    PassportStrategies.JWTStrategy();
    PassportStrategies.LocalStrategy();
    PassportStrategies.HttpStrategy();
    // github access token
    const github = nconf.get('github');
    if (github && _.get(github, 'clientID') !== '<client-id>') {
      logger.debug('enable github authentication strategy');
      PassportStrategies.GitHubStrategy(github);
      PassportStrategies.GitHubTokenStrategy(github);
    }
    const google = nconf.get('google');
    if (google && _.get(google, 'clientID') !== '<client-id>') {
      logger.debug('enable google authentication strategy');
      PassportStrategies.GoogleStrategy(google);
    }
  }

  static JWTStrategy() {
    // JWT
    const jwtStrategy = new JWTStrategy(
      {
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
      }
    );
    passport.use(jwtStrategy);
  }

  static LocalStrategy() {
    logger.info('Create local strategy');
    const localStrategy = new LocalStrategy(
      {usernameField: 'email'},
      (email, password, done) => {
        logger.debug(`local login: ${email}:${password.replace(/./g, '*')}`);
        const req = {};
        if (email.match(/.*@.*\..*/)) {
          req.email = email;
        } else {
          req.name = email;
        }
        logger.silly(`findOne(${JSON.stringify(req)})`);
        User.findOne(req)
          .select('_id name email groups apikeys +password')
          .exec()
          .then((user) => {
            invariant(user, 'Invalid email and/or password');
            return user;
          })
          .then((user) => user.comparePassword(password).return(user))
          .then((user) => {
            done(null, user);
          })
          .catch(done);
      }
    );
    passport.use(localStrategy);
  }

  static HttpStrategy() {
    passport.use(new HttpStrategy((userid, password, done) => {
      const req = {name: userid};
      logger.silly(`basic auth, findOne(${JSON.stringify(req)})`);
      User.findOne(req)
        .select('_id name email groups apikeys +password')
        .exec()
        .then((user) => {
          invariant(user, 'Invalid email and/or password');
          return user;
        })
        .then((user) => user.comparePassword(password).return(user))
        .then((user) => {
          done(null, user);
        })
        .catch((error) => {
          _.set(error, 'statusCode', 401);
          done(error);
        });
    }));
  }

  static _GithubStrategyHelper(oauth2, accessToken, profile, next) {
    logger.debug(`Profile: ${JSON.stringify(profile)}`);
    const emails = _.map(profile.emails, (obj) => ({email: obj.value}));
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
            return user;
          })
          .then((user) => Github.updateUsersGroup(user, group).return(user))
          .then((user) => next(null, user));
      })
      .catch(next);
  }

  static GitHubStrategy({clientID, clientSecret, callbackURL}) {
    logger.info('Create github strategy');
    const strategy = new GitHubStrategy(
      {
        clientID,
        clientSecret,
        callbackURL
      },
      (accessToken, refreshToken, profile, next) => {
        const oauth2 = strategy._oauth2;
        PassportStrategies._GithubStrategyHelper(oauth2, accessToken, profile, next);
      }
    );
    passport.use(strategy);
  }

  static GitHubTokenStrategy({clientID, clientSecret}) {
    logger.info('Create github token strategy');
    const strategy = new GitHubTokenStrategy(
      {clientID, clientSecret},
      (accessToken, refreshToken, profile, next) => {
        const oauth2 = strategy._oauth2;
        PassportStrategies._GithubStrategyHelper(oauth2, accessToken, profile, next);
      }
    );
    passport.use(strategy);
  }

  static GoogleStrategy({clientID, clientSecret, callbackURL}) {
    const googleStrategy = new GoogleStrategy(
      {clientID, clientSecret, callbackURL},
      (accessToken, refreshToken, profile, next) => {
        // @todo this might not working yet..
        User.findOrCreate({googleId: profile.id}, (err, user) => next(err, user));
      }
    );
    passport.use(googleStrategy);
  }
}

module.exports = PassportStrategies;
