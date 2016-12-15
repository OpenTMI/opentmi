var qs = require('querystring');
var nconf = require('nconf');
var mongoose = require('mongoose');
var request = require('request');
var auth = require('./../../config/middlewares/authorization');
var jwt = require('jwt-simple');
var async = require('async');
var _ = require('underscore');
var winston = require('winston');

var Controller = function () {
  var User = mongoose.model('User');
  var Group = mongoose.model('Group');
  var createJWT = auth.createJWT;
  var config = {
    GOOGLE_SECRET: nconf.get('google_secret'),
    TOKEN_SECRET: nconf.get('webtoken'),
  };

  /*
   |--------------------------------------------------------------------------
   | GET /api/me
   |--------------------------------------------------------------------------
   */
  this.getme = function (req, res) {
    User.findById(req.user.sub, function (err, user) {
      res.send(user);
    });
  };

  /*
   |--------------------------------------------------------------------------
   | PUT /api/me
   |--------------------------------------------------------------------------
   */
  this.putme = function (req, res) {
    User.findById(req.user.sub, function (err, user) {
      if (!user) {
        return res.status(400).send({ message: 'User not found' });
      }
      user.displayName = req.body.displayName || user.displayName;
      user.email = req.body.email || user.email;
      user.save(function (err) {
        res.status(200).end();
      });
    });
  };

  this.signup = function(req, res) {
    User.findOne({ email: req.body.email }, function (err, existingUser) {
      if (existingUser) {
        return res.status(409).send({ message: 'Email is already taken' });
      }
      var user = new User({
        displayName: req.body.displayName,
        email: req.body.email,
        password: req.body.password
      });
      user.save(function (err, result) {
        if (err) {
          res.status(500).send({ message: err.message });
        }
        res.send({ token: createJWT(result) });
      });
    });
  };

  this.login = function (req, res) {
    User.findOne({ email: req.body.email }, '+password', function (err, user) {
      if (!user) {
        return res.status(401).send({ message: 'Invalid email and/or password' });
      }
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (!isMatch) {
          return res.status(401).send({ message: 'Invalid email and/or password' });
        }
        res.send({ token: createJWT(user) });
      });
    });
  };

  this.logout = function (req, res) {
     req.logout();
     res.json({ logout: 'success' });
  };

  var loginRequiredResponse = function (req, res) {
    res.status(404).json({ error: 'login required' });
  };

  var apiKeyRequiredResponse = function (req, res) {
    res.status(404).json({ error: 'apikey required' });
  };

  this.loginRequired = function (req, res, next) {
    if (!req.user) {
      loginRequiredResponse(req, res);
    } else {
      next();
    }
  };

  this.apiKeyRequired = function (req, res, next) {
    User.apiKeyExists(req.query.apiKey, function (error, ok) {
      if (error) {
        apiKeyRequiredResponse(req, res);
      } else if (!ok) {
        apiKeyRequiredResponse(req, res);
      } else {
        next();
      }
    });
  };

  this.adminRequired = function (req, res, next) {
    if (!req.user) {
      loginRequiredResponse(req, res);
    } else if (!req.user.account_level) {
      res.status(404).json({ error: 'admin required' });
    } else {
      next();
    }
  };

  /*
   |--------------------------------------------------------------------------
   | Login with GitHub
   |--------------------------------------------------------------------------
   */
  this.github = function (req, res) {
    var accessTokenUrl = 'https://github.com/login/oauth/access_token';
    var userApiUrl = 'https://api.github.com/user';

    /*
      Authorize the user using github by exchanging authorization code for access token.
    */
    var authorization = function (callback) {
      var params = {
        code: req.body.code,
        client_id: req.body.clientId,
        client_secret: nconf.get('github').clientSecret,
        redirect_uri: req.body.redirectUri,
      };

      request.get({ url: accessTokenUrl, qs: params },
        function (err, response, accessToken) {
          if (err) {
            winston.info('Github auth: authorization error');
            callback({ status: 500, msg: err.toString() });
          } else {
            accessToken = qs.parse(accessToken);
            var headers = { 'User-Agent': 'Satellizer' };

            callback(null, accessToken, headers);
          }
        });
    };

    /*
      Retrieve the user's github profile.
    */
    var getProfile = function (accessToken, headers, callback) {
      request.get({ url: userApiUrl, qs: accessToken, headers, json: true },
        function (err, response, profile) {
          if (err) {
            winston.info('Github auth: getProfile error');
            callback({ status: 500, msg: err.toString() });
          } else if (!err && response.statusCode !== 200) {
            winston.info('Github auth: bad profile response');
            callback({ status: 409, msg: 'Did not get github profile.' });
          } else if (!profile.email) {
            winston.info('Github auth: no email error');
            callback({ status: 409, msg: 'Did not get email address.' });
          } else {
            callback(null, accessToken, headers, profile);
          }
        });
    };

    /*
      Ensure the user belongs to the required organization.
    */
    var checkOrganization = function (accessToken, headers, profile, callback) {
      request.get({ url: userApiUrl + '/orgs', qs: accessToken, headers, json: true },
        function (err, response) {
          if (err) {
            winston.info('Github auth: checkOrganization error');
            callback({ status: 500, msg: err.toString() });
          } else {
            var belongsOrg = _.find(response.body, { login: nconf.get('github').organization });

            if (belongsOrg) {
              callback(null, accessToken, headers, profile);
            } else {
              winston.info('Github auth: user not in organization');
              callback({ status: 401, msg: 'You do not have required access.' });
            }
          }
        });
    };

    /*
      Check if the user is an administrator or a normal employee in the organization.
    */
    var checkAdmin = function (accessToken, headers, profile, callback) {
      request.get({ url: userApiUrl + '/teams', qs: accessToken, headers, json: true },
        function (err, response) {
          if (err) {
            winston.info('Github auth: checkAdmin error');
            callback({ status: 500, msg: err.toString() });
          } else {
            var isAdmin = _.find(response.body, function (team) {
              return team.name === nconf.get('github').adminTeam && team.organization.login === nconf.get('github').organization;
            });
            profile.group = isAdmin ? 'admins' : '';

            callback(null, profile);
          }
        });
    };

    /*
      Retrieve the user from the database, or create a new entry if the user does not exist.
    */
    var prepareUser = function (profile, callback) {
      User.findOne({ $or: [{ github: profile.login }, { email: profile.email }] }, function (err, existingUser) {
        // Check if the user account exists.
        if (existingUser) {
          winston.info('Return an existing user account.');

          if (req.headers.authorization) {
            winston.info('Github auth: user authorized already');
            callback({ status: 409, msg: 'There is already a GitHub account that belongs to you' });
          } else if (existingUser.github !== profile.login) {
            winston.info('Github auth: updated github username');
            existingUser.github = profile.login;
            callback(null, existingUser, profile.group);
          } else {
            callback(null, existingUser, profile.group);
          }
        } else if (req.headers.authorization) {
          winston.info('Link user account with github account.');

          User.findById(req.user.sub, function (err, user) {
            if (!user) {
              winston.info('Github auth: no user found');
              return callback({ status: 400, msg: 'User not found' });
            } else {
              user.github = profile.login;
              user.picture = user.picture || profile.avatar_url;
              user.displayName = user.displayName || profile.name;
              user.name = user.displayName;
              user.email = user.email;
              callback(null, user, profile.group);
            }
          });
        } else {
          winston.info('Create a new user account.');

          var user = new User();
          user.github = profile.login;
          user.picture = profile.avatar_url;
          user.displayName = profile.name;
          user.name = user.displayName;
          user.email = profile.email;
          callback(null, user, profile.group);
        }
      });
    };

    /*
      Update the user's admin status.
    */
    var updateUser = function (user, groupname, callback) {
      winston.log('Github auth: update user');
      Group.findOne({ users: user, name: 'admins' }, function (err, group) {
        if (group && groupname !== 'admins') {
          user.removeFromGroup('admins', function (user) {
            if (user.message) {
              callback({ status: 500, msg: user.message });
            } else {
              user.save(callback(null, createJWT(user, groupname)));
            }
          });
        } else if (!group && groupname === 'admins') {
          user.addToGroup('admins', function (user) {
            if (user.message) {
              callback({ status: 500, msg: user.message });
            } else {
              user.save(callback(null, createJWT(user, groupname)));
            }
          });
        } else {
          user.save(callback(null, createJWT(user, groupname)));
        }
      });
    };

    var final = function (err, token) {
      if (err) {
        return res.status(err.status).json({
          message: err.msg,
        });
      }
      return res.send({ token });
    };

    async.waterfall([
      authorization,
      getProfile,
      checkOrganization,
      checkAdmin,
      prepareUser,
      updateUser,
    ], final);
  };

   /*
   |--------------------------------------------------------------------------
   | Login with Google
   |--------------------------------------------------------------------------
   */
  this.google = function (req, res) {
    var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
    var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';
    var params = {
      code: req.body.code,
      client_id: req.body.clientId,
      client_secret: config.GOOGLE_SECRET,
      redirect_uri: req.body.redirectUri,
      grant_type: 'authorization_code'
    };

    // Step 1. Exchange authorization code for access token.
    request.post(accessTokenUrl, { json: true, form: params }, function(err, response, token) {
      var accessToken = token.access_token;
      var headers = { Authorization: 'Bearer ' + accessToken };

      // Step 2. Retrieve profile information about the current user.
      request.get({ url: peopleApiUrl, headers: headers, json: true }, function(err, response, profile) {
        if (profile.error) {
          return res.status(500).send({message: profile.error.message});
        }
        // Step 3a. Link user accounts.
        if (req.headers.authorization) {
          User.findOne({ google: profile.sub }, function(err, existingUser) {
            if (existingUser) {
              return res.status(409).send({ message: 'There is already a Google account that belongs to you' });
            }
            var token = req.headers.authorization.split(' ')[1];
            var payload = jwt.decode(token, TOKEN_SECRET);
            User.findById(payload.sub, function(err, user) {
              if (!user) {
                return res.status(400).send({ message: 'User not found' });
              }
              user.google = profile.sub;
              user.picture = user.picture || profile.picture.replace('sz=50', 'sz=200');
              user.displayName = user.displayName || profile.name;
              user.save(function() {
                var token = createJWT(user);
                res.send({ token: token });
              });
            });
          });
        } else {
          // Step 3b. Create a new user account or return an existing one.
          User.findOne({ google: profile.sub }, function(err, existingUser) {
            if (existingUser) {
              return res.send({ token: createJWT(existingUser) });
            }
            var user = new User();
            user.google = profile.sub;
            user.picture = profile.picture.replace('sz=50', 'sz=200');
            user.displayName = profile.name;
            user.save(function(err) {
              var token = createJWT(user);
              res.send({ token: token });
            });
          });
        }
      });
    });
  };

  return this;
};

module.exports = Controller;
