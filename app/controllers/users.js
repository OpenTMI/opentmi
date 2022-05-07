/**
  Users Controller
*/

// 3rd party modules
const _ = require('lodash');
const crypto = require('crypto');
const moment = require('moment');
const Promise = require('bluebird');

// Own modules
const config = require('../tools/config');
const Emailer = require('./emailer');
const logger = require('../tools/logger');
const DefaultController = require('.');

class UsersController extends DefaultController {
  constructor() {
    super('User');
  }

  create(req, res) {
    return this._create(req.body)
      .then((item) => {
        const jsonItem = _.omit(item.toJSON(), ['password']);
        res.json(jsonItem);
      })
      .catch((error) => {
        res.status(400).json({error: error.message});
      });
  }

  deleteSettings(req, res) { // eslint-disable-line class-methods-use-this
    const namespace = req.params.Namespace;
    const doc = {$unset: {}};
    doc.$unset[`settings.${namespace}`] = 1;
    return req.user.update(doc)
      .then((resp) => {
        if (resp.modifiedCount === 1) {
          res.json({});
        } else {
          res.status(404).json({error: resp.message});
        }
      })
      .catch((error) => res.status(500).json({error: error.message}));
  }

  getSettings(req, res) { // eslint-disable-line class-methods-use-this
    return Promise.try(() => {
      const namespace = req.params.Namespace;
      const key = `settings.${namespace}`;
      const value = _.get(req.user, key);
      if (value) {
        const settings = _.get(req.user, key);
        res.json(settings);
      } else {
        // no settings stored under that namespace - give empty object
        res.json({});
      }
    });
  }

  updateSettings(req, res) { // eslint-disable-line class-methods-use-this
    const namespace = req.params.Namespace;
    const doc = {};
    doc[`settings.${namespace}`] = req.body;
    return req.user.update(doc)
      .then((resp) => {
        if (!resp.modifiedCount) {
          res.status(208);
        }
        res.json(req.body);
      })
      .catch((error) => res.status(500).json({error: `${error}`}));
  }

  forgotPassword(req, res) {
    return Promise
      .try(() => {
        const {email} = req.body;
        if (!email) {
          const error = new Error('missing email address');
          error.code = 400;
          throw error;
        }
        return email;
      })
      .then((email) => this.Model.findOne({email}))
      .then((theUser) => {
        const user = theUser;
        if (!user) {
          const error = new Error('email not exists');
          error.code = 400;
          throw error;
        }
        user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordExpires = moment().add(1, 'hours').toDate(); // 1 h
        return user.save();
      })
      .then((user) => {
        logger.debug(`User ${user.name} password reset token are: ${user.resetPasswordToken}`);
        return UsersController._notifyPasswordToken(user);
      })
      .then(() => res.status(200).json({message: 'password reset token is sent to you'}))
      .catch(UsersController._restCatch.bind(res));
  }

  static _notifyPasswordToken(user) {
    const token = user.resetPasswordToken;
    const subject = 'OpenTMI Password Change';
    const host = _.get(config.get('github'), 'callbackURL', 'https://opentmi');
    const link = `${host}/change-password/${token}`;
    const text = UsersController._tokenEmail(link, user.email, token);
    return Emailer.send({to: user.email, subject, text});
  }

  static _tokenEmail(link, email, token) {
    return 'You requested a password reset for your OpenTMI account.'
             + 'In case this request was not initiated by you, you can safely ignore it.\n\n'
             + 'Your account:\n'
             + `Email address: ${email}\n`
             + 'To reset your password, please click on the link below:\n'
             + `${link}\n`
             + `Or using token: ${token}`;
  }

  changePassword(req, res) {
    return Promise
      .try(() => {
        if (!_.has(req, 'body.password')
            || !_.has(req, 'body.token')) {
          const error = new Error('Missing token or new password');
          error.code = 400;
          throw error;
        }
      })
      .then(() => this.Model.findOne({
        resetPasswordToken: req.body.token,
        resetPasswordExpires: {$gt: Date.now()}
      }))
      .then((theUser) => {
        const user = theUser;
        if (!user) {
          const error = new Error('invalid or expired token');
          error.code = 401;
          throw error;
        }
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        return user.save();
      })
      .then(() => {
        res.status(200).json({message: 'password reset was successful'});
      })
      .catch(UsersController._restCatch.bind(res));
  }

  static _restCatch(error) {
    const body = {message: error.message};
    if (process.env.NODE_ENV !== 'production') {
      body.stack = error.stack;
      logger.error(error);
      logger.error(error.stack);
    }
    this.status(error.code || 500).json(body);
  }
}

module.exports = UsersController;
