// 3rd party modules
const express = require('express');

// application modules
const {requireAuth} = require('./middlewares/authorization');
const CronJobsController = require('./../controllers/cronjobs');

function Route(app) {
  const router = express.Router();
  const controller = new CronJobsController();

  router.param('cronjobs', controller.modelParam.bind(controller));


  router.route('/')
    .all(requireAuth)
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/:cronjobs')
    .all(requireAuth)
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .put(controller.update.bind(controller))
    .delete(controller.remove.bind(controller));

  router.route('/:cronjobs/view')
    .get(controller.showView.bind(controller));


  app.use('/api/v0/cron', router);
}

module.exports = Route;
