//3rd party modules
var express = require('express');
var mongoose = require('mongoose');
var nconf = require('nconf');
var restify = require('express-restify-mongoose');
var logger = require('winston');
var jwt = require('express-jwt');
var TOKEN_SECRET = nconf.get('webtoken');

var auth = require('./../../config/middlewares/authorization');

var user_controller = require('./../controllers/users')();
var auth_controller = require('./../controllers/authentication')();
var User = mongoose.model('User');

/**
 * Route middlewares
 */
var Route = function(app){
  // Create a default admin if there is no users in the database
  User.count({}, function(err, count) {
    if (count === 0) createDefaultAdmin();
  });

  //create user routes
  var router = express.Router();
  router.param('User', user_controller.paramUser);
  router.param('format', user_controller.paramFormat);

  router.route('/api/v0/users.:format?')
    .get(user_controller.find)
    .post(user_controller.create);

  router.route('/api/v0/users/:User.:format?')
    .get(user_controller.get)
    .put(user_controller.update)
    .delete(user_controller.remove);

  app.use(router);

  //create authentication routes:
  var apiKeys = require('./../controllers/apikeys');
  app.get('/api/v0/apikeys', jwt({ secret: TOKEN_SECRET }), auth.ensureAdmin, apiKeys.keys);
  app.get('/api/v0/users/:User/apikeys', jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, apiKeys.userKeys);
  app.get('/api/v0/users/:User/apikeys/new', jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, apiKeys.createKey);
  app.delete('/api/v0/users/:User/apikeys/:Key', jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, apiKeys.deleteKey);

  app.post('/auth/login', auth_controller.login );
  app.get('/auth/me', jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, auth_controller.getme );
  app.put('/auth/me', jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, auth_controller.putme );
  app.post('/auth/signup', auth_controller.signup );
  app.post('/auth/logout', auth_controller.logout );
  app.post('/auth/github', jwt({ secret: TOKEN_SECRET, credentialsRequired: false }), auth_controller.github );
  app.post('/auth/google', auth_controller.google );
  app.get('/auth/github/id', auth_controller.getGithubClientId);
};

function createDefaultAdmin() {
  var admin = new User();
  admin.name = nconf.get('admin').user;
  admin.password = nconf.get('admin').pwd;
  admin.save(function(err, user) {
    if(err) return console.log(err);
    else {
      user.addToGroup('admins', function(error, user) {
        if (error) logger.error(error);
        else logger.debug(user);
      });
    }
  });
}

module.exports = Route;
