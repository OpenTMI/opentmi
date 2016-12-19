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
    .get(jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, controller.find)
    .post(jwt({ secret: TOKEN_SECRET }), auth.ensureAdmin, controller.create);

  router.route('/api/v0/items/:Item.:format?')
    .get(jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, controller.get)
    .put(jwt({ secret: TOKEN_SECRET }), auth.ensureAdmin, controller.update)
    .delete(jwt({ secret: TOKEN_SECRET }), auth.ensureAdmin, controller.remove);

  router.route('/api/v0/items/:Item/image')
    .get(jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, controller.getImage);

  app.use(router);
};

module.exports = Route;
