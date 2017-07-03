var jwt = require('jwt-simple');
var moment = require('moment');
var mongoose = require('mongoose');
const nconf = require('../../config');
var logger = require('winston');
const TOKEN_SECRET = nconf.get('webtoken');
var _ = require('lodash');

var logger = require('winston');

var User = mongoose.model('User');
var Group = mongoose.model('Group');
/*
 |--------------------------------------------------------------------------
 | Login Required Middleware
 |--------------------------------------------------------------------------
 */
var getUserGroups = module.exports.getUserGroups = function getUserGroups(req, res, next) {
  if (!req.user) {
    return res.status(401).send({ message: 'not signed in' });
  }

  Group.find({ users: req.user.sub }, function (error, groups) {
    if (error) {
      return res.status(500).send({ message: error });
    }
    res.groups = groups;
    next();
  });
};

var ensureAuthenticated = module.exports.ensureAuthenticated = function ensureAuthenticated(err, req, res, next) {
  if (err) {
    logger.info(err);
    if (err.message) {
      return res.status(401).send({ message: err.message });
    }
    return res.sendStatus(401);
  }
  next();
};

var ensureAdmin = module.exports.ensureAdmin = function ensureAdmin(err, req, res, next) {
  ensureAuthenticated(err, req, res, function (req, res, next) {
    getUserGroups(req, res, function (req, res, next) {
      var isAdmin = _.find(req.groups, function (group) {
        return group.name === 'admins';
      });

      if (isAdmin) {
        next();
      } else {
        res.status.send({ message: 'Admin access required!' });
      }
    });
  });
};

/*
 |--------------------------------------------------------------------------
 | Generate JSON Web Token
 |--------------------------------------------------------------------------
 */
module.exports.createJWT = function (user, group) {
  logger.info('Auth middleware: creating JWT token');
  var payload = {
    sub: user._id,
    group,
    iat: moment().unix(),
    exp: moment().add(2, 'hours').unix(),
  };

  return jwt.encode(payload, TOKEN_SECRET);
};

