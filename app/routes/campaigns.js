const express = require('express');
const CampaignsRouter = require('./../controllers/campaigns');

var Route = function(app, passport) {
  var router = express.Router();
  var controller = new CampaignsRouter();

  router.param('Campaign', controller.paramCampaign);
  router.param('format', controller.paramFormat);

  router.route('/api/v0/campaigns.:format?')
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/api/v0/campaigns/:Campaign.:format?')
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .put(controller.update.bind(controller))
    .delete(controller.remove.bind(controller));

  app.use(router);
}

module.exports = Route;