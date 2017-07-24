// Third party modules
const express = require('express');
const mongoose = require('mongoose');
const nconf = require('../../config');
const jwt = require('express-jwt');
const logger = require('winston');

// Local modules
const auth = require('./../../config/middlewares/authorization');
const apiKeys = require('./../controllers/apikeys');
const UserController = require('./../controllers/users');
const AuthController = require('./../controllers/authentication');

// Route variables
const TOKEN_SECRET = nconf.get('webtoken');
const User = mongoose.model('User');
const userController = new UserController();
const authController = new AuthController();


function createDefaultAdmin() {
  const admin = new User();
  admin.name = nconf.get('admin').user;
  admin.password = nconf.get('admin').pwd;
  admin.save((error, user) => {
    if (error) {
      return logger.error(error);
    }

    user.addToGroup('admins', (addError, addedUser) => {
      if (addError) logger.error(addError);
      else logger.debug(addedUser);
    });

    return undefined;
  });
}

/**
 * Route middlewares
 */
function Route(app) {
  // Create a default admin if there is no users in the database
  User.count({}, (err, count) => {
    if (count === 0) { createDefaultAdmin(); }
  });

  // Create user routes
  const router = express.Router();
  router.param('User', userController.modelParam.bind(userController));

  // Route for operations that target all users
  router.route('/api/v0/users.:format?')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, userController.find.bind(userController))
    .post(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, userController.create.bind(userController));

  // Route for operations that target individual users
  router.route('/api/v0/users/:User.:format?')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, userController.get.bind(userController))
    .put(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, userController.update.bind(userController))
    .delete(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, userController.remove.bind(userController));

  app.use(router);

  // Create authentication routes:
  app.get('/api/v0/apikeys', jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, apiKeys.keys);
  app.get('/api/v0/users/:User/apikeys', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, apiKeys.userKeys);
  app.get('/api/v0/users/:User/apikeys/new', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, apiKeys.createKey);
  app.delete('/api/v0/users/:User/apikeys/:Key', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated,
    apiKeys.deleteKey);

  app.post('/auth/login', authController.login.bind(authController));
  app.get('/auth/me', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated,
    authController.getme.bind(authController));
  app.put('/auth/me', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated,
    authController.putme.bind(authController));
  app.post('/auth/signup', authController.signup.bind(authController));
  app.post('/auth/logout', authController.logout.bind(authController));
  app.post('/auth/github', jwt({secret: TOKEN_SECRET, credentialsRequired: false}), AuthController.github);
  app.post('/auth/google', authController.google.bind(authController));
  app.get('/auth/github/id', AuthController.getGithubClientId);

  /**
   * Empty callback route for addon OAuth 2 authentication flow to retain passed parameters in the url.
   */
  app.get('/auth/redirect', (req, res) => {
    res.sendStatus(200);
  });
}


module.exports = Route;
