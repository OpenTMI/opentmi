/**
  Groups Controller
*/

// native modules

// 3rd party modules
const _ = require('lodash');
const uuid = require('node-uuid');

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

  get idParam() {
    return (req, res, next) => {
      req.Worker = {};
      next();
    };
  }

  all(req, res, next) { // eslint-disable-line class-methods-use-this
    // dummy middleman function..
    next();
  }

  get(req, res) {
    const payload = {id: uuid.v1()};
    eventBus.once(payload.id, (data) => {
      const worker = _.find(data.workers, {id: this.id});
      if (worker) {
        res.json(worker);
      } else {
        res.status(404);
      }
    });
    eventBus.emit('masterStatus', payload);
  }

  find(req, res) {
    const payload = {id: uuid.v1()};
    eventBus.once(payload.id, (data) => {
      res.json(data);
    });
    eventBus.emit('masterStatus', payload);
  }

  create(req, res) {
    res.status(503);
  }

  update(req, res) {
    res.status(503);
  }

  remove(req, res) {
    res.status(200);
    process.exit();
  }
}

module.exports = ClusterController;
