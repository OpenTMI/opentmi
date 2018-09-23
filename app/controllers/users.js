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
  deleteSettings(req, res) { // eslint-disable-line class-methods-use-this
    const namespace = req.params.Namespace;
    const doc = {$unset: {}};
    doc.$unset[`settings.${namespace}`] = 1;
    req.user.update(doc)
      .catch(error => res.status(500).json({error: error.message}))
      .then((resp) => {
        if (resp.nModified === 1) {
          res.json({});
        } else {
          res.status(404).json({error: resp.message});
        }
      });
  }
  getSettings(req, res) { // eslint-disable-line class-methods-use-this
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
  }
  updateSettings(req, res) { // eslint-disable-line class-methods-use-this
    const namespace = req.params.Namespace;
    const doc = {};
    doc[`settings.${namespace}`] = req.body;
    req.user.update(doc)
      .catch(error => res.status(500).json({error: error.message}))
      .then((resp) => {
        if (resp.nModified === 1) {
          res.json(req.body);
        } else {
          res.status(500).json({error: resp});
        }
      });
  }
}

module.exports = UsersController;
