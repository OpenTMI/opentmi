// Third party modules
const express = require('express');
const jwt = require('express-jwt');

// Local modules
const nconf = require('../../config');
const auth = require('./../../config/middlewares/authorization');
const ItemController = require('./../controllers/items');

const TOKEN_SECRET = nconf.get('webtoken');

function Route(app) {
  const router = express.Router();
  const controller = new ItemController();

  router.param('Item', controller.modelParam.bind(controller));

  router.route('/api/v0/items.:format?')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, controller.find.bind(controller))
    .post(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.create.bind(controller));

  router.route('/api/v0/items/:Item.:format?')
    .get(jwt({secret: TOKEN_SECRET}), auth.ensureAuthenticated, controller.get.bind(controller))
    .put(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.update.bind(controller))
    .delete(jwt({secret: TOKEN_SECRET}), auth.ensureAdmin, controller.remove.bind(controller));

  router.route('/api/v0/items/:Item/image')
    .get(ItemController.getImage);

  app.use(router);
}

module.exports = Route;
