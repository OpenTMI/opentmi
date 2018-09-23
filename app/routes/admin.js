// native modules
const cluster = require('cluster');

// Third party modules
const express = require('express');

// Application modules
const {jwt, ensureAuthenticated, ensureAdmin} = require('./middlewares/authorization');
const AdminController = require('./../controllers/admin');
const {notClustered} = require('./../controllers/common');


function Route(app) {
  const router = express.Router();
  const controller = new AdminController();

  router.route('/api/v0/version.:format?')
    .all(jwt, ensureAdmin)
    .get(controller.version.bind(controller))
    .post(controller.update.bind(controller));

  let restart;
  if (!cluster.isMaster && cluster.worker.isConnected()) {
    restart = controller.restart.bind(controller);
  } else {
    restart = notClustered;
  }
  router.route('/api/v0/restart')
    .all(jwt, ensureAdmin)
    .post(restart);

  app.use(router);
}

module.exports = Route;
