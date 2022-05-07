const express = require('express');
const BuildController = require('../controllers/builds');

function Route(app) {
  const router = express.Router();
  const controller = new BuildController();

  router.param('Build', controller.modelParam.bind(controller));
  router.param('Index', BuildController.indexParam);

  router.route('/api/v0/duts/builds.:format?')
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/api/v0/duts/builds/:Build.:format?')
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .put(controller.update.bind(controller))
    .delete(controller.remove.bind(controller));

  router.route('/api/v0/duts/builds/:Build/files/:Index/download')
    .get(BuildController.download);

  app.use(router);
}

module.exports = Route;
