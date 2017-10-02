// native modules
const cluster = require('cluster');

// Third party modules
const express = require('express');
const jwt = require('express-jwt');

// Application modules
const nconf = require('../../config');
const auth = require('./../../config/middlewares/authorization');
const AdminController = require('./../controllers/admin');
const {notClustered} = require('./../controllers/common');

// Route variables
const TOKEN_SECRET = nconf.get('webtoken');

function Route(app) {
  const router = express.Router();
  const controller = new AdminController();

  router.route('/api/v0/version.:format?')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.version.bind(controller))
    .post(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.update.bind(controller));

  if (!cluster.isMaster && cluster.worker.isConnected()) {
    router.route('/api/v0/restart')
      .post(jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, controller.restart.bind(controller));
  } else {
    router.route('/api/v0/restart')
      .post(jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, notClustered);
  }
  app.use(router);
}

module.exports = Route;
