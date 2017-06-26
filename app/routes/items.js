const express = require('express');
const nconf = require('nconf');
const auth = require('./../../config/middlewares/authorization');
const jwt = require('express-jwt');
const ItemController = require('./../controllers/items');

const TOKEN_SECRET = nconf.get('webtoken');

const Route = function (app) {
  const router = express.Router();
  const controller = new ItemController();

  router.param('Item', controller.modelParam.bind(controller));

  router.route('/api/v0/items.:format?')
    .get(jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, controller.find.bind(controller))
    .post(jwt({ secret: TOKEN_SECRET }), auth.ensureAdmin, controller.create.bind(controller));

  router.route('/api/v0/items/:Item.:format?')
    .get(jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, controller.get.bind(controller))
    .put(jwt({ secret: TOKEN_SECRET }), auth.ensureAdmin, controller.update.bind(controller))
    .delete(jwt({ secret: TOKEN_SECRET }), auth.ensureAdmin, controller.remove.bind(controller));

  router.route('/api/v0/items/:Item/image')
    .get(jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, ItemController.getImage);

  app.use(router);
};

module.exports = Route;
