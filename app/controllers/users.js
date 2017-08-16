/**
  Users Controller
*/

// 3rd party modules
const _ = require('lodash');

// Own modules
const DefaultController = require('./');


class UsersController extends DefaultController {
  constructor() {
    super('User');
  }
  deleteSettings(req, res) {
    const namespace = req.params.Namespace;
    this.Model.findById(req.user.sub).then(
      (user) => {
        if (_.has(user, `settings.${namespace}`)) {
          user.settings[namespace] = {}; // eslint-disable-line no-param-reassign
          user.markModified('settings');
          user.save();
          res.send({message: 'settings cleared'});
        } else {
          res.send({message: 'no settings to clear'});
        }
      }
    );
  }
  getSettings(req, res) {
    const namespace = req.params.Namespace;
    this.Model.findById(req.user.sub).then(
      (user) => {
        const settings = _.get(user, `settings.${namespace}`, {});
        res.send(settings);
      }
    );
  }
  updateSettings(req, res) {
    const namespace = req.params.Namespace;
    this.Model.findById(req.user.sub).then(
      (user) => {
        _.defaults(user, {settings: {}});
        user.settings[namespace] = req.body.settings; // eslint-disable-line no-param-reassign
        user.markModified('settings');
        user.save();
        res.send({message: 'settings saved'});
      }
    );
  }
}

module.exports = UsersController;
