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
  admin.save((pError, pUser) => {
    if (pError) {
      return logger.error(pError);
    }

    pUser.addToGroup('admins', (pAddError, pAddUser) => {
      if (pAddError) logger.error(pAddError);
      else logger.debug(pAddUser);
    });

    return undefined;
  });
}

/**
 * Route middlewares
 */
function Route(pApp) {
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

  pApp.use(router);

  // Create authentication routes:
  pApp.get('/api/v0/apikeys', jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, apiKeys.keys);
  pApp.get('/api/v0/users/:User/apikeys', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, apiKeys.userKeys);
  pApp.get('/api/v0/users/:User/apikeys/new', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, apiKeys.createKey);
  pApp.delete('/api/v0/users/:User/apikeys/:Key', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated,
    apiKeys.deleteKey);

  pApp.post('/auth/login', authController.login.bind(authController));
  pApp.get('/auth/me', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated,
    authController.getme.bind(authController));
  pApp.put('/auth/me', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated,
    authController.putme.bind(authController));
  pApp.post('/auth/signup', authController.signup.bind(authController));
  pApp.post('/auth/logout', authController.logout.bind(authController));
  pApp.post('/auth/github', jwt({secret: TOKEN_SECRET, credentialsRequired: false}), AuthController.github);
  pApp.post('/auth/google', authController.google.bind(authController));
  pApp.get('/auth/github/id', AuthController.getGithubClientId);
}


module.exports = Route;
