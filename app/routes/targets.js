var express = require('express');

var Route = function(app, passport){

  var router = express.Router();
  var controller = require('./../controllers/targets')();

  router.param('Target', controller.paramTarget );
  router.param('format', controller.paramFormat );

  
  router.route('/api/v0/targets.:format?')
    .all( controller.all )
    .get( controller.find )
    .post(controller.create );
  
  router.route('/api/v0/targets/:Target.:format?')
    .all( controller.all )
    .get( controller.get )
    .put( controller.update )
    .delete( controller.remove );

  router.route('/api/v0/targets/:Target/gt')
    .all( controller.all )
    .get( controller.getGt )
  
  app.use( router );
}

module.exports = Route;