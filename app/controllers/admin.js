/**
  Admin Controller
*/

// Native modules
const path = require('path');

// Third party modules
const _ = require('lodash');

// own modules
const logger = require('../tools/logger');
const Updater = require('../tools/update');

class AdminController {
  constructor() {
    this._updater = new Updater(path.resolve(__dirname, '..', '..'));
  }

  version(req, resp) {
    this._updater.version()
      .then(version => resp.json(version))
      .catch((error) => {
        logger.warn(error);
        resp.status(500)
          .json({message: error.message, error: error});
      });
  }

  update(req, resp) {
    if (!_.isString(_.get(req.body, 'revision'))) {
      return resp.status(403).json({message: 'Invalid or missing revision'});
    }

    return this._updater.update(req.body.revision)
      .then(() => resp.sendStatus(204))
      .catch((error) => {
        resp.status(500)
          .json({message: error.message});
      });
  }

  restart(req, resp) {
    this._updater.restart(req.body)
      .then(() => resp.sendStatus(204))
      .catch((error) => {
        resp.status(500)
          .json({message: error.message});
      });
  }
}

module.exports = AdminController;
