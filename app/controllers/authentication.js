var qs = require('querystring');
var nconf = require('nconf');
var mongoose = require('mongoose');
var request = require('request');
var auth = require('./../../config/middlewares/authorization');
var jwt = require('jwt-simple');
var async = require('async');
var _ = require('underscore');
var winston = require('winston');

var Controller = function(){

  var User = mongoose.model('User');
  var Group = mongoose.model('Group');
  var createJWT = auth.createJWT;
  var config = {
    GOOGLE_SECRET: nconf.get('google_secret'),
    TOKEN_SECRET: nconf.get('webtoken')
  }

  /*
   |--------------------------------------------------------------------------
   | GET /api/me
   |--------------------------------------------------------------------------
   */
  this.getme = function(req, res) {
    User.findById(req.user, function(err, user) {
      res.send(user);
    });
  }

  /*
   |--------------------------------------------------------------------------
   | PUT /api/me
   |--------------------------------------------------------------------------
   */
  this.putme = function(req, res) {
    User.findById(req.user, function(err, user) {
      if (!user) {
        return res.status(400).send({ message: 'User not found' });
      }
      user.displayName = req.body.displayName || user.displayName;
      user.email = req.body.email || user.email;
      user.save(function(err) {
        res.status(200).end();
      });
    });
  }

  this.signup = function(req, res) {
    User.findOne({ email: req.body.email }, function(err, existingUser) {
      if (existingUser) {
        return res.status(409).send({ message: 'Email is already taken' });
      }
      var user = new User({
        displayName: req.body.displayName,
        email: req.body.email,
        password: req.body.password
      });
      user.save(function(err, result) {
        if (err) {
          res.status(500).send({ message: err.message });
        }
        res.send({ token: createJWT(result) });
      });
    });
  }

  this.login = function(req, res) {
    User.findOne({ email: req.body.email }, '+password', function(err, user) {
      if (!user) {
        return res.status(401).send({ message: 'Invalid email and/or password' });
      }
      user.comparePassword(req.body.password, function(err, isMatch) {
        if (!isMatch) {
          return res.status(401).send({ message: 'Invalid email and/or password' });
        }
        res.send({ token: createJWT(user) });
      });
    });
  }
  this.logout = function(req, res){
     req.logout();
     res.json({logout: 'success'});
  }
  var loginRequiredResponse = function(req, res){
    res.status(404).json({error: 'login required'});
  }
  var apiKeyRequiredResponse = function(req, res){
    res.status(404).json({error: 'apikey required'});
  }
  this.loginRequired = function(req, res, next){
    if( !req.user){
      loginRequiredResponse(req, res);
    } else {
      next()
    }
  }

  this.apiKeyRequired = function(req, res, next){
    User.apiKeyExists(req.query.apiKey, function(error, ok){
      if(error){
        apiKeyRequiredResponse(req, res);
      } else if(!ok){
        apiKeyRequiredResponse(req, res);
      } else {
        next();
      }
    })
  }
  this.adminRequired = function(req, res, next){
    if( !req.user ){
      loginRequiredResponse(req, res);
    } else if(!req.user.account_level){
      res.status(404).json({error: 'admin required'});
    } else {
      next();
    }
  }
  
  /*
   |--------------------------------------------------------------------------
   | Login with GitHub
   |--------------------------------------------------------------------------
   */
  this.github = function(req, res)
  {
    var accessTokenUrl = 'https://github.com/login/oauth/access_token';
    var userApiUrl = 'https://api.github.com/user';
    var orgsApiUrl = 'https://api.github.com/user/orgs';
    var teamsApiUrl = 'https://api.github.com/user/teams';

    var authorization = function(callback)
    {
      var params = {
        code: req.body.code,
        client_id: req.body.clientId,
        client_secret: nconf.get('github').clientSecret,
        redirect_uri: req.body.redirectUri
      };

      request.get({url: accessTokenUrl, qs: params},
        function(err, response, accessToken)
        {
          if (err) { callback(err); return; }

          accessToken = qs.parse(accessToken);
          var headers = { 'User-Agent': 'Satellizer' };

          callback(null, accessToken, headers);
        });
    };

    var getProfile = function(accessToken, headers, callback)
    {
      request.get({url: userApiUrl, qs: accessToken, headers: headers, json: true}, 
        function(err, response, profile)
        {
          if (err) { callback(err); return; }

          if(response.statusCode != 200) 
          {
            return res.status(409).json({
              message: profile.message
            });
          }

          if(!profile.email)
          {
            return res.status(409).json({
              message: 'Did not get email address.'
            });
          }

          callback(null, accessToken, headers, profile);
        });
    };

    var checkOrganization = function(accessToken, headers, profile, callback) 
    {
      request.get({url: orgsApiUrl, qs: accessToken, headers: headers, json: true},
        function(err, response)
        {
          if (err) { callback(err); return; }

          var belongsOrg = _.find(response.body, {id: parseInt(nconf.get('github').orgId)});

          if (belongsOrg)
          {
            callback(null, accessToken, headers, profile);
          }
          else
          {
            return res.status(401).send({
              message: 'You do not have required access.'
            })
          }
        });
    };

    var checkAdmin = function(accessToken, headers, profile, callback)
    {
      request.get({ url: teamsApiUrl, qs: accessToken, headers: headers, json: true},
        function(err, response)
        {
          if (err) { callback(err); return; }

          var isAdmin = _.find(response.body, {id: parseInt(nconf.get('github').adminTeamId)});

          if (isAdmin)
          {
            profile.role = "admin";
          }
          else
          {
            profile.role = "user";
          }

          callback(null, profile);
        });
    };

    var ready = function(err, profile)
    {
      // Helper function to update user's admin group status.
      var updateGroup = function(user, done)
      {
        Group.findOne({users: user, name: "admins"}, function(err, group)
        {
          if (group && profile.role === "user")
          {
            user.removeFromGroup("admins", function(user)
            {
              user.save(done);
            });
          }
          else if (!group && profile.role === "admin")
          {
            user.addToGroup("admins", function(user)
            {
              user.save(done);
            });
          }
          else
          {
            user.save(done);
          }
        });
      };

      if (err)
      {
        return res.sendStatus(500);
      }

      User.findOne({github: profile.id}, function(err, existingUser)
      {
        // Check if the user account exists.
        if (existingUser)
        {
          winston.info("Return an existing user account.");

          if (req.headers.authorization)
          {
            return res.status(409).send({ message: 'There is already a GitHub account that belongs to you' });
          }

          updateGroup(existingUser, function()
          {
            var token = createJWT(existingUser, profile.role);
            return res.send({token: token});
          });

        }
        else
        {
          // Check if the user account needs to be created or just linked.
          if (req.headers.authorization)
          {
            winston.info("Link user account with github account.");
            var token = req.headers.authorization.split(' ')[1];
            var payload = jwt.decode(token, config.TOKEN_SECRET);
            User.findById(payload.sub, function(err, user)
            {
              if (!user) 
              {
                return res.status(400).send({ message: 'User not found' });
              }
              user.github = profile.id;
              user.picture = user.picture || profile.avatar_url;
              user.displayName = user.displayName || profile.name;
              user.name = user.displayName;
              user.email = user.email;
              updateGroup(user, function()
              {
                var token = createJWT(user, profile.role);
                res.send({token: token});
              });
            });
          }
          else
          {
            winston.info("Create a new user account.");
            var user = new User();
            user.github = profile.id;
            user.picture = profile.avatar_url;
            user.displayName = profile.name;
            user.email = profile.email;

            updateGroup(user, function()
            {
              var token = createJWT(user, profile.role);
              res.send({token: token});
            })
          }
        }
      }); // End User.findOne()

    };

    async.waterfall([authorization, getProfile, checkOrganization, checkAdmin], ready);
  }

  return this;
}

module.exports = Controller;
