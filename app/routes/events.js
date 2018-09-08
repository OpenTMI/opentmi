// 3rd party modules
const express = require('express');
const jwt = require('express-jwt');

// application modules
const nconf = require('../tools/config');
const {ensureAdmin, ensureAuthenticated} = require('./middlewares/authorization');
const EventsController = require('./../controllers/events');

// Route variables
const TOKEN_SECRET = nconf.get('webtoken');

function Route(app) {
  const router = express.Router();
  const controller = new EventsController();

  router.param('Event', controller.modelParam.bind(controller));

  const jwtMdl = jwt({secret: TOKEN_SECRET});
  const authentication = [jwtMdl, ensureAuthenticated];

  router.route('/api/v0/events.:format?')
    .all(...authentication)
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/api/v0/events/:Event.:format?')
    .all(...authentication)
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .delete(ensureAdmin, controller.remove.bind(controller));
  router.route('/api/v0/events/:Event/ref')
    .all(...authentication)
    .all(controller.all.bind(controller))
    .get(EventsController.redirectRef);
  router.route('/api/v0/resources/:Resource/utilization')
    .all(...authentication)
    .get(controller.utilization.bind(controller));
  router.route('/api/v0/resources/:Resource/statistics')
    .all(...authentication)
    .get(controller.statistics.bind(controller));
  router.route('/api/v0/resources/:Resource/events')
    .all(...authentication)
    .get(controller.resourceEvents.bind(controller));
  app.use(router);
}

module.exports = Route;
