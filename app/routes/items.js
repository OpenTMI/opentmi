var express = require('express');
var nconf = require('nconf');
var auth = require('./../../config/middlewares/authorization');
var jwt = require('express-jwt');
var TOKEN_SECRET = nconf.get('webtoken');

var Route = function(app){

  var router = express.Router();
  var controller = require('./../controllers/items')();

  router.param('Item', controller.paramItem);
  router.param('format', controller.paramFormat);

  router.route('/api/v0/items.:format?')
    .get(controller.find)
    .post(controller.create);

  router.route('/api/v0/items/:Item.:format?')
    .get(controller.get)
    .put(controller.update)
    .delete(controller.remove);

  app.use(router);
};

module.exports = Route;
