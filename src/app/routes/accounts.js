var express = require('express');

var Route = function(app, passport){

  var router = express.Router();
  var controller = require('./../controllers/account.js')();
  
  router.param('account', controller.paramAccount );

  router.route('/api/v0/accounts.:format?')
    .all( controller.all )
    .get( controller.find )
    .post(controller.create );
  
  router.route('/api/v0/accounts/:account.:format?')
    .all( controller.all )
    .get( controller.get )
    .put( controller.update )
    .delete( controller.remove );

  app.use( router );
}

module.exports = Route;
