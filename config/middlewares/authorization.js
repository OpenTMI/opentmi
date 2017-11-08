// Third party modules
const jwt = require('jwt-simple');
const moment = require('moment');
const mongoose = require('mongoose');
const logger = require('../../app/tools/logger');
const async = require('async');
const _ = require('lodash');

// Local modules
const nconf = require('../../config');
require('../../app/models/group');

// Middleware variables
const TOKEN_SECRET = nconf.get('webtoken');
const Group = mongoose.model('Group');
const TOKEN_EXPIRATION_HOURS = 2;

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
        groups: _.map(populatedUser.groups, g => g._id),
        iat: moment().unix(),
        exp: moment().add(TOKEN_EXPIRATION_HOURS, 'hours').unix()
      };
      // @todo remove this when it is not needed anymore! - just backward compatible reason.
      payload.sub = payload._id;
      return jwt.encode(payload, TOKEN_SECRET);
    });
}

module.exports = {
  getUserGroups,
  ensureAuthenticated,
  ensureAdmin,
  createJWT
};
