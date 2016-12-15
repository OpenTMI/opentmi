var express = require('express');
var nconf = require('nconf');
var auth = require('./../../config/middlewares/authorization');
var jwt = require('express-jwt');
var TOKEN_SECRET = nconf.get('webtoken');

var Route = function(app){

  var router = express.Router();
  var controller = require('./../controllers/loans')();

  router.param('Loan', controller.paramLoan);
  router.param('format', controller.paramFormat);

  router.route('/api/v0/loans.:format?')
    .get(controller.find)
    .post(controller.create);

  router.route('/api/v0/loans/me')
    .get(jwt({ secret: TOKEN_SECRET }), auth.ensureAuthenticated, controller.getMe);

  router.route('/api/v0/loans/:Loan.:format?')
    .get(controller.get)
    .put(controller.update)
    .delete(controller.remove);

  app.use(router);
};

module.exports = Route;
