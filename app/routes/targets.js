const express = require('express');
const TargetController = require('./../controllers/targets');

function Route(pApp) {
  const router = express.Router();
  const controller = new TargetController();

  router.param('Target', controller.modelParam.bind(controller));

  router.route('/api/v0/targets.:format?')
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/api/v0/targets/:Target.:format?')
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .put(controller.update.bind(controller))
    .delete(controller.remove.bind(controller));

  router.route('/api/v0/targets/:Target/gt')
    .all(controller.all.bind(controller))
    .get(TargetController.getGt);

  pApp.use(router);
}

module.exports = Route;
