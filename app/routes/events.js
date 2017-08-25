const express = require('express');
const EventsController = require('./../controllers/events');

function Route(app) {
  const router = express.Router();
  const controller = new EventsController();

  router.param('Event', controller.modelParam.bind(controller));

  router.route('/api/v0/events.:format?')
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/api/v0/events/:Event.:format?')
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .delete(controller.remove.bind(controller));

  app.use(router);
}

module.exports = Route;
