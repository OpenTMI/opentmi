// Third party modules
const express = require('express');

// Application modules
const SchemaController = require('./../controllers/schemas');
const {requireAuth} = require('./middlewares/authorization');


function Route(app) {
  const router = express.Router();
  const controller = new SchemaController();

  router.param('Collection', controller.paramCollection.bind(controller));

  router.route('/api/v0/schemas.:format?')
    .get(requireAuth, controller.get.bind(controller));

  router.route('/api/v0/schemas/:Collection.:format?')
    .get(requireAuth, SchemaController.find);

  app.use(router);
}

module.exports = Route;
