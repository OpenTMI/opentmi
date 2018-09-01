// Third party modules
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const nconf = require('../tools/config');
const logger = require('../tools/logger');

// Local modules
const auth = require('./middlewares/authorization');
const apiKeys = require('./../controllers/apikeys');
const UserController = require('./../controllers/users');
const AuthController = require('./../controllers/authentication');

// Route variables
const User = mongoose.model('User');
const userController = new UserController();
const authController = new AuthController();


function createDefaultAdmin() {
  logger.info('Create default admin accounts');
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
  User.isEmpty()
    .then((empty) => {
      if (empty) { createDefaultAdmin(); }
    })
    .catch(error => logger.warn(error));

  // Create user routes
  const userRouter = express.Router();
  userRouter.param('User', userController.modelParam.bind(userController));

  const jwtMiddle = passport.authenticate('jwt', {session: false});

  // Route for operations that target all users
  userRouter.route('/')
    .get(jwtMiddle, auth.ensureAdmin, userController.find.bind(userController))
    .post(jwtMiddle, auth.ensureAdmin, userController.create.bind(userController));

  // Route for operations that target individual users
  const singleUserRouter = express.Router({mergeParams: true});
  singleUserRouter.route('/')
    .get(jwtMiddle, auth.ensureAdmin, userController.get.bind(userController))
    .put(jwtMiddle, auth.ensureAdmin, userController.update.bind(userController))
    .delete(jwtMiddle, auth.ensureAdmin, userController.remove.bind(userController));

  // Create User settings routes
  singleUserRouter.route('/settings/:Namespace')
    .get(jwtMiddle, auth.ensureAuthenticated, userController.getSettings.bind(userController))
    .put(jwtMiddle, auth.ensureAuthenticated, userController.updateSettings.bind(userController))
    .delete(jwtMiddle, auth.ensureAuthenticated, userController.deleteSettings.bind(userController));

  // allows to use /client-settings instead of /settings
  userRouter.use('/client-settings/', express.Router().all((req) => { req.redirect('../settings'); }));

  // Create authentication routes:
  app.get('/api/v0/apikeys', jwtMiddle, auth.ensureAdmin, apiKeys.keys);
  const apikeysRouter = express.Router();

  apikeysRouter
    .get('/', jwtMiddle, auth.ensureAuthenticated, apiKeys.userKeys)
    .get('/new', jwtMiddle, auth.ensureAuthenticated, apiKeys.createKey)
    .delete('/:Key', jwtMiddle, auth.ensureAuthenticated, apiKeys.deleteKey);
  singleUserRouter.use('/apikeys', apikeysRouter);


  // register user routers
  userRouter.use('/:User', singleUserRouter);
  app.use('/api/v0/users', userRouter);

  const authRoute = express.Router();
  authRoute
    .post('/login', passport.authenticate('local'), AuthController.sendToken)
    .get('/me', jwtMiddle, auth.ensureAuthenticated, authController.getme.bind(authController))
    .put('/me', jwtMiddle, auth.ensureAuthenticated, authController.putme.bind(authController))
    .post('/signup', authController.signup.bind(authController))
    .post('/logout', authController.logout.bind(authController))
    // .post('/google', passport.authenticate('google'), AuthController.google)
    .post('/github', passport.authenticate('github'), AuthController.sendToken)
    .post('/github/token', passport.authenticate('github-token'), AuthController.sendToken)
    .get('/github/id', AuthController.GetGithubClientId);
  app.use('/auth', authRoute);

  /**
   * Empty callback route for addon OAuth 2 authentication flow to retain passed parameters in the url.
   */
  app.get('/auth/redirect', (req, res) => {
    res.sendStatus(200);
  });
}


module.exports = Route;
