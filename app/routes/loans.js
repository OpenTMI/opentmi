var express = require('express');
var auth = require('./../../config/middlewares/authorization');

var Route = function(app){

  var router = express.Router();
  var controller = require('./../controllers/loans')();	

  router.param('Loan', controller.paramLoan);
  router.param('format', controller.paramFormat);

  router.route('/api/v0/loans.:format?')
    .get(controller.find)
    .post(controller.create);

  router.route('/api/v0/loans/me')
    .get(auth.ensureAuthenticated, controller.me);

  router.route('/api/v0/loans/:Loan.:format?')
    .get(controller.get)
    .put(controller.update)
    .delete(controller.remove);

  app.use(router);
}

module.exports = Route;
