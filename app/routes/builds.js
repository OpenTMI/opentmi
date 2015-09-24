var express = require('express');

var Route = function(app, passport){

  var router = express.Router();
  var controller = require('./../controllers/builds')();

  router.param('Build', controller.paramBuild );
  router.param('format', controller.paramFormat );

  
  router.route('/api/v0/duts/builds.:format?')
    .all( controller.all )
    .get( controller.find )
    .post(controller.create );
  
  router.route('/api/v0/duts/builds/:Build.:format?')
    .all( controller.all )
    .get( controller.get )
    .put( controller.update )
    .delete( controller.remove );
  
  app.use( router );
}

module.exports = Route;