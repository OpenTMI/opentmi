const express = require('express');
const SchemaController = require('./../controllers/schemas');

function Route(app) {
  const router = express.Router();
  const controller = new SchemaController();

  router.param('Collection', controller.paramCollection.bind(controller));

  router.route('/api/v0/schemas.:format?')
    .get(controller.get.bind(controller));

  router.route('/api/v0/schemas/:Collection.:format?')
    .get(SchemaController.find);

  app.use(router);
}

module.exports = Route;
