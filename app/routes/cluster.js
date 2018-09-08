// native modules
const cluster = require('cluster');

// Third party modules
const express = require('express');
const jwt = require('express-jwt');

// Local modules
const nconf = require('../tools/config');
const auth = require('./middlewares/authorization');
const ClusterController = require('./../controllers/clusters');
const {notClustered} = require('./../controllers/common');

const TOKEN_SECRET = nconf.get('webtoken');

function Route(app) {
  const router = express.Router();
  if (!cluster.isMaster && cluster.worker.isConnected()) {
    const controller = new ClusterController();
    router.param('Cluster', controller.idParam.bind(this));
    router.route('/api/v0/clusters.:format?')
      .get(controller.find.bind(controller))
      .post(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.create.bind(controller));

    router.route('/api/v0/clusters/:Cluster.:format?')
      .get(jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, controller.get.bind(controller))
      .put(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.update.bind(controller))
      .delete(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.remove.bind(controller));

    app.use(router);
  } else {
    router.route('/api/v0/clusters')
      .get(notClustered)
      .post(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, notClustered);

    app.use(router);
  }
}

module.exports = Route;
