// native modules
const cluster = require('cluster');

// Third party modules
const express = require('express');

// Local modules
const {requireAuth, requireAdmin} = require('./middlewares/authorization');
const ClusterController = require('./../controllers/clusters');
const {notClustered} = require('./../controllers/common');


function Route(app) {
  const router = express.Router();
  if (!cluster.isMaster && cluster.worker.isConnected()) {
    const controller = new ClusterController();
    router.param('Cluster', controller.idParam.bind(this));
    router.route('/api/v0/clusters.:format?')
      .all(requireAuth)
      .get(controller.find.bind(controller))
      .post(requireAdmin, controller.create.bind(controller));

    router.route('/api/v0/clusters/:Cluster.:format?')
      .all(requireAuth)
      .get(controller.get.bind(controller))
      .put(requireAdmin, controller.update.bind(controller))
      .delete(requireAdmin, controller.remove.bind(controller));
  } else {
    router.route('/api/v0/clusters')
      .all(requireAuth)
      .get(notClustered)
      .post(requireAdmin, notClustered);
  }
  app.use(router);
}

module.exports = Route;
