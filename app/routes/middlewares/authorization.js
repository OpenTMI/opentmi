// Third party modules
const jwt = require('jwt-simple');
const moment = require('moment');
const mongoose = require('mongoose');
const async = require('async');
const uuid = require('uuid');
const passport = require('passport');

// Local modules
const logger = require('../../tools/logger');
const nconf = require('../../tools/config');
require('../../models/group');

// Middleware variables
const TOKEN_SECRET = nconf.get('webtoken');
const Group = mongoose.model('Group');
const TOKEN_EXPIRATION_DAYS = 5;

/*
 |--------------------------------------------------------------------------
 | Login Required Middleware
 |--------------------------------------------------------------------------
 */
function getUserGroups(req, res, next) {
  if (!req.user) {
    return res.status(401).send({message: 'not signed in'});
  }

  Group.find({users: req.user._id}, (error, groups) => {
    if (error) {
      return res.status(500).send({message: error});
    }
    res.groups = groups;
    return next();
  });

  return undefined;
}

function ensureAuthenticated(err, req, res, next) {
  if (err) {
    logger.info(err);
    if (err.message) {
      return res.status(401).send({message: err.message});
    }
    return res.sendStatus(401);
  }
  return next();
}

function ensureAdmin(error, req, res, next) {
  async.waterfall([
    ensureAuthenticated.bind(this, error, req, res),
    getUserGroups.bind(this, req, res)
  ], () => {
    const isAdmin = req.groups.find(group => group.name === 'admins');

    if (isAdmin) {
      next();
    } else {
      res.status.send({message: 'Admin access required!'});
    }
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

module.exports = {
  getUserGroups,
  ensureAuthenticated,
  ensureAdmin,
  createJWT,
  jwt: jwtMiddle
};
