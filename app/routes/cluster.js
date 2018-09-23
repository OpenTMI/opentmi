// native modules
const cluster = require('cluster');

// Third party modules
const express = require('express');

// Local modules
const {jwt, ensureAuthenticated, ensureAdmin} = require('./middlewares/authorization');
const ClusterController = require('./../controllers/clusters');
const {notClustered} = require('./../controllers/common');


function Route(app) {
  const router = express.Router();
  if (!cluster.isMaster && cluster.worker.isConnected()) {
    const controller = new ClusterController();
    router.param('Cluster', controller.idParam.bind(this));
    router.route('/api/v0/clusters.:format?')
      .get(controller.find.bind(controller))
      .post(jwt, ensureAdmin, controller.create.bind(controller));

    router.route('/api/v0/clusters/:Cluster.:format?')
      .get(jwt, ensureAuthenticated, controller.get.bind(controller))
      .put(jwt, ensureAdmin, controller.update.bind(controller))
      .delete(jwt, ensureAdmin, controller.remove.bind(controller));

    app.use(router);
  } else {
    router.route('/api/v0/clusters')
      .get(notClustered)
      .post(jwt, ensureAdmin, notClustered);

    app.use(router);
  }
}

module.exports = Route;
