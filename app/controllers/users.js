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
    const doc = {$unset: {}};
    doc.$unset[`settings.${namespace}`] = 1;
    req.User.update(doc)
      .catch(error => res.status(500).json({message: error.message}))
      .then((resp) => {
        if (resp.ok === 1) {
          res.json({});
        } else {
          res.status(500).json({message: resp});
        }
      });

    /*

    this.Model.findById(req.user.sub).then(
      (user) => {
        if (_.has(user, `settings.${namespace}`)) {
          user.settings[namespace] = {}; // eslint-disable-line no-param-reassign
          user.markModified('settings');
          user.save((error) => {
            if (error) {
              res.status(500).json({message: error.message});
            } else {
              res.json({message: 'settings cleared'});
            }
          });
        } else {
          res.json({message: 'no settings to clear'});
        }
      }
    );
    */
  }
  getSettings(req, res) {
    const namespace = req.params.Namespace;
    const key = `settings.${namespace}`;
    console.log(req.User)
    const value = _.get(req.User, key);
    if (value) {
      const settings = _.get(req.User, key);
      res.json(settings);
    } else {
      res.status(404).json({message: `No settings for ${namespace}`});
    }
  }
  updateSettings(req, res) {
    const namespace = req.params.Namespace;
    const doc = {};
    doc[`settings.${namespace}`] = req.body;
    req.User.update(doc)
      .catch(error => res.status(500).json({message: error.message}))
      .then((resp) => {
        if (resp.ok === 1) {
          res.json(req.body);
        } else {
          res.status(500).json({message: resp});
        }
      });
  }
}

module.exports = UsersController;
