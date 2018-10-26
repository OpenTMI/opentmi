/**
  Users Controller
*/

// 3rd party modules
const _ = require('lodash');
const Promise = require('bluebird');

// Own modules
const DefaultController = require('./');


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
        if (resp.nModified === 1) {
          res.json({});
        } else {
          res.status(404).json({error: resp.message});
        }
      })
      .catch(error => res.status(500).json({error: error.message}));
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
        if (!resp.nModified) {
          res.status(208);
        }
        res.json(req.body);
      })
      .catch(error => res.status(500).json({error: `${error}`}));
  }
}

module.exports = UsersController;
