const express = require('express');
const ResourceController = require('./../controllers/resources');

function Route(app) {
  const router = express.Router();
  const controller = new ResourceController();

  router.param('Resource', controller.modelParam.bind(controller));
  router.param('Alloc', ResourceController.paramAlloc);

  router.route('/api/v0/resources.:format?')
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));

  router.route('/api/v0/resources/allocation')
    // .get( controller.list_allocs )
    .put(ResourceController.allocMultiple);

  // router.route('/api/v0/resources/allocation/:Alloc')
  //  .get( controller.list_alloc_resources );

  router.route('/api/v0/resources/allocation/:Alloc/release')
    .put(ResourceController.releaseMultiple);

  router.route('/api/v0/resources/:Resource.:format?')
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .put(controller.update.bind(controller))
    .delete(controller.remove.bind(controller));

  router.route('/api/v0/resources/:Resource/alloc')
    .put(ResourceController.alloc.bind(controller));

  router.route('/api/v0/resources/:Resource/release')
    .put(ResourceController.release);

  router.route('/api/v0/resources/:Resource/device/build')
    .put(ResourceController.setDeviceBuild);

  router.route('/api/v0/resources/:Resource/route')
    .get(ResourceController.solveRoute);

  app.use(router);
}

module.exports = Route;
