/**
  Admin Controller
*/

// own modules
const logger = require('../tools/logger');
const Updater = require('../tools/update');

class AdminController {
  constructor() {
    this._updater = new Updater();
  }
  version(req, resp) {
    this._updater.version()
      .then(resp.json.bind(resp))
      .catch((error) => {
        logger.warn(error);
        resp.status(500)
          .json({message: error.message, error: error});
      });
  }
  update(req, resp) {
    if (!_.isString(req.body, 'revision')) {
      resp.status(403)
        .json({message: 'Invalid or missing revision'});
      return;
    }
    this._updater.update(req.body.revision)
      .then(resp.json.bind(resp))
      .catch((error) => {
        resp.status(500)
          .json({message: error.message});
      });
  }
  restart(req, resp) {
    this._updater.restart(req.body)
      .then(resp.json.bind(resp))
      .catch((error) => {
        resp.status(500)
          .json({message: error.message});
      });
  }
}

module.exports = AdminController;
