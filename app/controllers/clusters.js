/**
  Groups Controller
*/

// native modules

// 3rd party modules
const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('uuid/v1');

// own modules
const cluster = require('cluster');
const eventBus = require('../tools/eventBus');


class ClusterController {
  constructor() {
    this._worker_id = cluster.worker.id;
  }
  get id() {
    return this._worker_id;
  }

  get idParam() { // eslint-disable-line class-methods-use-this
    return (req, res, next) => {
      req.Worker = {};
      next();
    };
  }

  all(req, res, next) { // eslint-disable-line class-methods-use-this
    // dummy middleman function..
    next();
  }

  static status() {
    let _resolve;
    return (new Promise((resolve) => {
      const payload = {id: uuid()};
      _resolve = resolve;
      eventBus.once(payload.id, (meta, data) => resolve(data));
      eventBus.emit('masterStatus', payload);
    }))
      .timeout(5000)
      .catch(Promise.TimeoutError, (e) => {
        eventBus.removeListener(_resolve);
        throw e;
      });
  }

  get(req, res) {
    ClusterController.status()
      .then((data) => {
        const worker = _.find(data.workers, {id: this.id});
        if (worker) {
          res.json(worker);
        } else {
          res.status(404);
        }
      })
      .catch((err) => {
        res.status(500).json({error: err});
      });
  }

  find(req, res) { // eslint-disable-line class-methods-use-this
    ClusterController.status()
      .then((data) => {
        res.json(data);
      })
      .catch((err) => {
        res.status(500).json(err);
      });
  }

  create(req, res) { // eslint-disable-line class-methods-use-this
    res.status(503);
  }

  update(req, res) { // eslint-disable-line class-methods-use-this
    res.status(503);
  }

  remove(req, res) { // eslint-disable-line class-methods-use-this
    res.status(200);
    process.exit();
  }
}

module.exports = ClusterController;
