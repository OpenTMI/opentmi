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
  const userRouter = express.Route();
  userRouter.param('User', userController.modelParam.bind(userController));

  // Route for operations that target all users
  userRouter.route('/.:format?')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, userController.find.bind(userController))
    .post(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, userController.create.bind(userController));

  // Route for operations that target individual users
  userRouter.route('/:User.:format?')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, userController.get.bind(userController))
    .put(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, userController.update.bind(userController))
    .delete(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, userController.remove.bind(userController));


  // Create User settings routes
  const settingsRoute = express.Route();
  settingsRoute.route('/:Namespace')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, userController.getSettings.bind(userController))
    .put(jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, userController.updateSettings.bind(userController))
    .delete(jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, userController.deleteSettings.bind(userController));
  userRouter.use('/settings', settingsRoute);

  // allows to use /client-settings instead of /settings
  userRouter.use('/client-settings/', express.Route().all((req) => { req.redirect('../settings'); }));

  // Create authentication routes:
  app.get('/api/v0/apikeys', jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, apiKeys.keys);
  userRouter
    .get('/apikeys', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, apiKeys.userKeys)
    .get('/apikeys/new', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, apiKeys.createKey)
    .delete('/apikeys/:Key', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, apiKeys.deleteKey);

  // register user router
  app.use('/api/v0/users', userRouter);

  const authRoute = express.Route();
  authRoute
    .post('/login', authController.login.bind(authController))
    .get('/me', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, authController.getme.bind(authController))
    .put('/me', jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, authController.putme.bind(authController))
    .post('/signup', authController.signup.bind(authController))
    .post('/logout', authController.logout.bind(authController))
    .post('/google', authController.google.bind(authController))
    .post('/github', jwt({secret: TOKEN_SECRET, credentialsRequired: false}), AuthController.github)
    .get('/github/id', AuthController.getGithubClientId);
  app.use('/auth', authRoute);

  /**
   * Empty callback route for addon OAuth 2 authentication flow to retain passed parameters in the url.
   */
  app.get('/auth/redirect', (req, res) => {
    res.sendStatus(200);
  });
}


module.exports = Route;
