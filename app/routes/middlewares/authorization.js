// Third party modules
const jwt = require('jwt-simple');
const moment = require('moment');
const uuid = require('uuid');
const passport = require('passport');
const _ = require('lodash');

// Local modules
const logger = require('../../tools/logger');
const nconf = require('../../tools/config');
require('../../models/group');

// Middleware variables
const TOKEN_SECRET = nconf.get('webtoken') || uuid.v1();


function requireAdmin(req, res, next) {
  // this might not good idea to allow token to say if client is admin or not
  // what if token will expires after one month and admin credentials are already dropped..
  // @todo remove this eventually when tests generate token via API call..
  logger.silly(`[${req.method}] ${req.originalUrl}: req.decoded_token: ${JSON.stringify(req.decoded_token)}`);
  if (_.get(req, 'decoded_token.group') === 'admins' ||
    _.find(_.get(req, 'decoded_token.groups', []), g => g === 'admins')
  ) {
    logger.debug('admin based on token..', req.user);
    next();
    return;
  }
  req.user.isAdmin()
    .then((yes) => {
      if (yes) {
        logger.debug('admin based on User.isAdmin()');
        next();
      } else {
        logger.debug(`${req.user.name} tries to use admin route..`);
        res.status(401).json({
          method: req.method,
          url: req.originalUrl,
          message: 'Admin access required!'
        });
      }
    })
    .catch((error) => {
      logger.error(`${_.get(req, 'user.name', '?')} exception: ${error}`);
      next(error);
    });
}

/*
 |--------------------------------------------------------------------------
 | Generate JSON Web Token
 |--------------------------------------------------------------------------
 */
function createJWT(user) {
  logger.info('Auth middleware: creating JWT token');
  return user
    .populate('groups')
    .execPopulate()
    .then((populatedUser) => {
      const expDays = nconf.get('webtoken_expiration_days');
      logger.debug(`webtoken_expiration_days = ${expDays}`);
      const payload = {
        _id: populatedUser._id,
        groups: populatedUser.groups.map(g => g.name),
        group: populatedUser.groups.find(g => g.name === 'admins') ? 'admins' : 'users',
        iat: moment().unix(),
        exp: moment().add(expDays, 'days').unix()
      };
      const options = {
        jwtid: uuid.v1()
      };
      return jwt.encode(payload, TOKEN_SECRET, null, options);
    });
}

const requireAuth = passport.authenticate('jwt', {session: false});
const ensureAdmin = [requireAuth, requireAdmin];

module.exports = {
  requireAuth,
  requireAdmin,
  ensureAdmin,
  createJWT
};
