const mongoose = require('mongoose');

const logger = require('../tools/logger');
const nconf = require('../tools/config');
const {createJWT} = require('../routes/middlewares/authorization');
const PassportStrategies = require('./passport');

const User = mongoose.model('User');
const Group = mongoose.model('Group');


class AuthenticationController {
  constructor() {
    PassportStrategies.createStrategies();
  }
  // Simple route middleware to ensure user is authenticated.
  //   Use this route middleware on any resource that needs to be protected.  If
  //   the request is authenticated (typically via a persistent login session),
  //   the request will proceed.  Otherwise, the user will be redirected to the
  //   login page.
  static ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { next(); } else { res.redirect('/login'); }
  }
  static loginRequiredResponse(req, res) {
    res.status(404).json({error: 'login required'});
  }
  static apiKeyRequiredResponse(req, res) {
    res.status(404).json({error: 'apikey required'});
  }

  static sendToken(req, res) {
    // If this function gets called, authentication was successful.
    // req.user` contains the authenticated user.
    createJWT(req.user)
      .then(token => res.json({token}));
  }
  // GET /api/me
  getme(req, res) { // eslint-disable-line class-methods-use-this
    User.findById(req.user._id, (error, user) => {
      if (error) {
        res.status(500).json({error: error.message});
      } else if (user) {
        res.json(user);
      } else {
        res.status(404).json({error: 'user not found!'});
      }
    });
  }

  // PUT /api/me
  putme(req, res) { // eslint-disable-line class-methods-use-this
    User.findById(req.user._id, (error, user) => {
      if (!user) {
        return res.status(400).send({message: 'User not found'});
      }
      const editedUser = user;
      editedUser.displayName = req.body.displayName || user.displayName;
      editedUser.email = req.body.email || user.email;
      editedUser.save(() => {
        res.status(200).end();
      });
      return undefined;
    });
  }
  // POST /auth/signup
  signup(req, res) { // eslint-disable-line class-methods-use-this
    User.findOne({email: req.body.email}, (error, user) => {
      if (user) {
        return res.status(409).send({message: 'Email is already taken'});
      }
      const newUser = new User({
        displayName: req.body.displayName,
        email: req.body.email,
        password: req.body.password
      });

      newUser.save((saveError, result) => {
        if (saveError) {
          res.status(500).send({message: saveError.message});
        }
        createJWT(result)
          .then(token => res.json({token}));
      });

      return undefined;
    });
  }
  //
  logout(req, res) { // eslint-disable-line class-methods-use-this
    // rest authentication is stored only in token -
    // not stored in backend side -> just return success.
    res.status(200).end();
  }

  loginRequired(req, res, next) {
    if (!req.user) {
      this.loginRequiredResponse(req, res);
    } else {
      next();
    }
  }

  apiKeyRequired(req, res, next) {
    User.apiKeyExists(req.query.apiKey, (error, ok) => {
      if (error) {
        this.apiKeyRequiredResponse(req, res);
      } else if (!ok) {
        this.apiKeyRequiredResponse(req, res);
      } else {
        next();
      }
    });
  }

  adminRequired(req, res, next) {
    if (!req.user) {
      this.loginRequiredResponse(req, res);
    } else if (!req.user.account_level) {
      res.status(404).json({error: 'admin required'});
    } else {
      next();
    }
  }

  static GetGithubClientId(req, res) {
    logger.info('Github auth: returning github clientID');
    const {clientId} = nconf.get('github');
    if (clientId === undefined) {
      logger.warn('Github auth: clientId was undefined, perhaps it is not defined in the config.');
      res.status(400).json({error: 'found client id is undefined'});
    } else {
      res.status(200).json({clientID: clientId});
    }
  }
}

module.exports = AuthenticationController;
