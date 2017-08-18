// Third party modules
const jwt = require('jwt-simple');
const moment = require('moment');
const mongoose = require('mongoose');
const logger = require('../../app/tools/logger');
const async = require('async');

// Local modules
const nconf = require('../../config');
require('../../app/models/group');

// Middleware variables
const TOKEN_SECRET = nconf.get('webtoken');
const Group = mongoose.model('Group');

/*
 |--------------------------------------------------------------------------
 | Login Required Middleware
 |--------------------------------------------------------------------------
 */
function getUserGroups(req, res, next) {
  if (!req.user) {
    return res.status(401).send({message: 'not signed in'});
  }

  Group.find({users: req.user.sub}, (error, groups) => {
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
function createJWT(user, group) {
  logger.info('Auth middleware: creating JWT token');
  const payload = {
    sub: user._id,
    group,
    iat: moment().unix(),
    exp: moment().add(2, 'hours').unix()
  };

  return jwt.encode(payload, TOKEN_SECRET);
}

module.exports = {
  getUserGroups,
  ensureAuthenticated,
  ensureAdmin,
  createJWT
};
