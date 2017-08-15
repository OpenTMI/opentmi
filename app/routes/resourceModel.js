const express = require('express');
const TargetController = require('../controllers/resourceModel');

function Route(app) {
  const router = express.Router();
  const controller = new TargetController();

  router.param('Model', controller.modelParam.bind(controller));

  router.route('/api/v0/resource-models.:format?')
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/api/v0/resource-models/:Model.:format?')
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .put(controller.update.bind(controller))
    .delete(controller.remove.bind(controller));

  app.use(router);
}

module.exports = Route;
