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
const TOKEN_SECRET = nconf.get('webtoken');
const TOKEN_EXPIRATION_DAYS = 5;


function requireAdmin(req, res, next) {
  if (_.get(req, 'decoded_token.group') === 'admin') {
    next();
  }
  if (_.get(req, 'decoded_token.groups.0') === 'admin') {
    next();
  }
  req.user.isAdmin()
    .then((yes) => {
      if (yes) {
        next();
      } else {
        res.status(401).json({message: 'Admin access required!'});
      }
    })
    .catch(next);
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
      const payload = {
        _id: populatedUser._id,
        groups: populatedUser.groups.map(g => g.name),
        group: populatedUser.groups.find(g => g.name === 'admins') ? 'admins' : 'users',
        iat: moment().unix(),
        exp: moment().add(TOKEN_EXPIRATION_DAYS, 'days').unix()
      };
      const options = {
        jwtid: uuid.v1()
      };
      return jwt.encode(payload, TOKEN_SECRET, null, options);
    });
}

const jwtMiddle = passport.authenticate('jwt', {session: false});

const requireAuth = jwtMiddle;
const ensureAdmin = [requireAuth, requireAdmin];

module.exports = {
  requireAuth,
  requireAdmin,
  ensureAdmin,
  createJWT
};
