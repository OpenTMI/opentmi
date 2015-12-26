var jwt = require('jwt-simple');
var moment = require('moment');
var mongoose = require('mongoose');
var nconf = require('nconf');
var TOKEN_SECRET = nconf.get('webtoken');
var _ = require('underscore');

var User = mongoose.model('User');
var Group = mongoose.model('Group');
/*
 |--------------------------------------------------------------------------
 | Login Required Middleware
 |--------------------------------------------------------------------------
 */
var ensureAuthenticated = module.exports.ensureAuthenticated = function(req, res, next) {
  console.log('ensureAuthentication');
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Please make sure your request has an Authorization header' });
  }
  var token = req.headers.authorization.split(' ')[1];

  var payload = null;
  try {
    payload = jwt.decode(token, TOKEN_SECRET);
  }
  catch (err) {
    return res.status(401).send({ message: err.message });
  }

  if (payload.exp <= moment().unix()) {
    return res.status(401).send({ message: 'Token has expired' });
  }
  req.user = payload.sub;
  next();
}
var getUser = module.exports.getUser = function(req, res, next){
  ensureAuthenticated(req, res, function(req, res, next){
    User.findOne({ _id: req.user}, function(error, user){
      if( error ){
        return res.status(401).send({message: error.message});
      }
      res.user = user;
      next();
    });
  })
}
var getUserGroup = module.exports.getUserGroup = function(req, res, next){
  if( !req.user ) {
    return res.status(401).send({message: 'not signed in'});
  }
  Group.find({users: req.user}, function(error, groups){
    if( error ){
      return res.status(500).send({message: error});
    }
    res.groups = groups;
    next();
  });
}
module.exports.ensureAdmin = function(req, res, next) {
  ensureAuthenticated(req, res, function(req, res, next){
    getUserGroup(req, res, function(req, res, next){
      if( _.find(req.groups, function(group){
        if( group.name == 'admins'){ return true; }
      })) {
        next();
      } else {
        res.status(401).send({message: 'Sorry, admin access required'});
      }
    });
  })
}

/*
 |--------------------------------------------------------------------------
 | Generate JSON Web Token
 |--------------------------------------------------------------------------
 */
module.exports.createJWT = function(user) {
  console.log('createJWT token');
  var payload = {
    sub: user._id,
    iat: moment().unix(),
    exp: moment().add(14, 'days').unix()
  };
  return jwt.encode(payload, TOKEN_SECRET);
}