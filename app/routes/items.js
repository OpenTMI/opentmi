// Third party modules
const express = require('express');

// Local modules
const {requireAuth, requireAdmin} = require('./middlewares/authorization');
const ItemController = require('./../controllers/items');


function Route(app) {
  const router = express.Router();
  const controller = new ItemController();

  router.param('Item', controller.modelParam.bind(controller));

  router.route('/api/v0/items.:format?')
    .all(requireAuth)
    .get(controller.find.bind(controller))
    .post(requireAdmin, controller.create.bind(controller));

  router.route('/api/v0/items/:Item.:format?')
    .all(requireAuth)
    .get(controller.get.bind(controller))
    .put(requireAdmin, controller.update.bind(controller))
    .delete(requireAdmin, controller.remove.bind(controller));

  router.route('/api/v0/items/:Item/image')
    .get(ItemController.getImage);

  app.use(router);
}

module.exports = Route;
