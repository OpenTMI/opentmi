// Third party modules
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const nconf = require('../tools/config');
const logger = require('../tools/logger');

// Local modules
const {requireAuth, requireAdmin, ensureAdmin} = require('./middlewares/authorization');
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
  return admin.save()
    .then(user => user.addToGroup('admins'))
    .then(user => logger.debug(`default admin account created, ObjectId: ${user._id}`))
    .catch(error => logger.error(error));
}

/**
 * Route middlewares
 */
function Route(app) {
  // Create a default admin if there is no users in the database
  User.isEmpty()
    .then((empty) => {
      if (empty) { return createDefaultAdmin(); }
      return User
        .find({name: 'admin'}).select('+password')
        .then(([user]) => {
          if (!user.password) {
            logger.debug('Admin doesnt have password, set default one: "admin"');
            user.password = 'admin';
            return user.save();
          }
        });
    })
    .catch(error => logger.warn(error));

  // Create user routes
  const userRouter = express.Router();
  userRouter.param('User', userController.modelParam.bind(userController));

  // Route for operations that target all users
  userRouter.route('/')
    .all(...ensureAdmin)
    .get(userController.find.bind(userController))
    .post(userController.create.bind(userController));

  // Route for operations that target individual users
  const singleUserRouter = express.Router({mergeParams: true});
  singleUserRouter.route('/')
    .all(...ensureAdmin)
    .get(userController.get.bind(userController))
    .put(userController.update.bind(userController))
    .delete(userController.remove.bind(userController));

  // Create User settings routes
  singleUserRouter.route('/settings/:Namespace')
    .all(requireAuth)
    .get(userController.getSettings.bind(userController))
    .put(userController.updateSettings.bind(userController))
    .delete(userController.deleteSettings.bind(userController));

  // allows to use /client-settings instead of /settings
  userRouter.use('/client-settings/', express.Router().all((req) => { req.redirect('../settings'); }));

  // Create authentication routes:
  app.get('/api/v0/apikeys', requireAuth, requireAdmin, apiKeys.keys);
  const apikeysRouter = express.Router({mergeParams: true});

  apikeysRouter
    .get('/', requireAuth, apiKeys.userKeys)
    .get('/new', requireAuth, apiKeys.createKey)
    .delete('/:Key', requireAuth, apiKeys.deleteKey);
  singleUserRouter.use('/apikeys', apikeysRouter);


  // register user routers
  userRouter.use('/:User', singleUserRouter);
  app.use('/api/v0/users', userRouter);

  // password recovery
  app.post('/api/v0/password/forgot', userController.forgotPassword.bind(userController));
  app.post('/api/v0/password/change', userController.changePassword.bind(userController));


  const authRoute = express.Router();
  authRoute
    .post('/login', passport.authenticate('local'),
      AuthController.sendToken, AuthController.loginFail)
    .get('/me', requireAuth, authController.getme.bind(authController))
    .put('/me', requireAuth, authController.putme.bind(authController))
    .post('/signup', authController.signup.bind(authController))
    .post('/logout', authController.logout.bind(authController))
    .get('/google', passport.authenticate('google', AuthController.GetScope('google')),
      AuthController.sendToken, AuthController.loginFail)
    .get('/github', passport.authenticate('github', AuthController.GetScope('github')),
      AuthController.sendToken, AuthController.loginFail)
    .post('/github', AuthController.loginPostFix,
      passport.authenticate('github', AuthController.GetScope('github')),
      AuthController.sendToken, AuthController.loginFail)
    .post('/github/token', passport.authenticate('github-token'),
      AuthController.sendToken, AuthController.loginFail)
    .get('/github/id', AuthController.GetClientId('github'))
    .get('/google/id', AuthController.GetClientId('google'));
  app.use('/auth', authRoute);

  /**
   * Empty callback route for addon OAuth 2 authentication flow to retain passed parameters in the url.
   */
  app.get('/auth/redirect', (req, res) => {
    res.sendStatus(200);
  });
}


module.exports = Route;
