// 3rd party modules
const express = require('express');

// application modules
const {requireAuth} = require('./middlewares/authorization');
const EventsController = require('./../controllers/events');

function Route(app) {
  const router = express.Router();
  const controller = new EventsController();

  router.param('Resource', controller.resolveResource.bind(controller));
  router.param('Event', controller.modelParam.bind(controller));

  router.route('/api/v0/events.:format?')
    .all(requireAuth)
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/api/v0/events/:Event.:format?')
    .all(requireAuth)
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .delete(controller.remove.bind(controller));
  router.route('/api/v0/events/:Event/ref')
    .all(requireAuth)
    .all(controller.all.bind(controller))
    .get(EventsController.redirectRef);
  router.route('/api/v0/resources/:Resource/utilization')
    .all(requireAuth)
    .get(controller.utilization.bind(controller));
  router.route('/api/v0/resources/:Resource/statistics')
    .all(requireAuth)
    .get(controller.statistics.bind(controller));
  router.route('/api/v0/resources/:Resource/events')
    .all(requireAuth)
    .get(controller.resourceEvents.bind(controller));
  app.use(router);
}

module.exports = Route;
