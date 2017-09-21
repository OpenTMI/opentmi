const express = require('express');
const CampaignsRouter = require('./../controllers/campaigns');

function Route(app) {
  const router = express.Router();
  const controller = new CampaignsRouter();

  router.param('Campaign', controller.modelParam.bind(controller));

  router.route('/api/v0/campaigns.:format?')
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/api/v0/campaigns/:Campaign.:format?')
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .put(controller.update.bind(controller))
    .delete(controller.remove.bind(controller));

  router.route('/api/v0/campaigns/:Campaign/version/:Version([0-9]+)')
    .all(controller.all.bind(controller))
    .put(controller.update.bind(controller));

  app.use(router);
}

module.exports = Route;
