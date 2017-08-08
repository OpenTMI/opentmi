// Third party modules
const express = require('express');
const jwt = require('express-jwt');

// Application modules
const SchemaController = require('./../controllers/schemas');
const auth = require('./../../config/middlewares/authorization');
const nconf = require('../../config');

// Route variables
const TOKEN_SECRET = nconf.get('webtoken');

function Route(app) {
  const router = express.Router();
  const controller = new SchemaController();

  router.param('Collection', controller.paramCollection.bind(controller));

  router.route('/api/v0/schemas.:format?')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, controller.get.bind(controller));

  router.route('/api/v0/schemas/:Collection.:format?')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, SchemaController.find);

  app.use(router);
}

module.exports = Route;
