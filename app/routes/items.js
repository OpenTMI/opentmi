// Third party modules
const express = require('express');

// Local modules
const {jwt, ensureAuthenticated, ensureAdmin} = require('./middlewares/authorization');
const ItemController = require('./../controllers/items');


function Route(app) {
  const router = express.Router();
  const controller = new ItemController();

  router.param('Item', controller.modelParam.bind(controller));

  router.route('/api/v0/items.:format?')
    .get(jwt, ensureAuthenticated, controller.find.bind(controller))
    .post(jwt, ensureAdmin, controller.create.bind(controller));

  router.route('/api/v0/items/:Item.:format?')
    .get(jwt, ensureAuthenticated, controller.get.bind(controller))
    .put(jwt, ensureAdmin, controller.update.bind(controller))
    .delete(jwt, ensureAdmin, controller.remove.bind(controller));

  router.route('/api/v0/items/:Item/image')
    .get(ItemController.getImage);

  app.use(router);
}

module.exports = Route;
