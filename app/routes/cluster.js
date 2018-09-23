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
      .get(requireAuth, controller.find.bind(controller))
      .post(requireAdmin, controller.create.bind(controller));

    router.route('/api/v0/clusters/:Cluster.:format?')
      .get(requireAuth, controller.get.bind(controller))
      .put(requireAuth, requireAdmin, controller.update.bind(controller))
      .delete(requireAuth, requireAdmin, controller.remove.bind(controller));
  } else {
    router.route('/api/v0/clusters')
      .get(requireAuth, notClustered)
      .post(requireAuth, requireAdmin, notClustered);
  }
  app.use(router);
}

module.exports = Route;
