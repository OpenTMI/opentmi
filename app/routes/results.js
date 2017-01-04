var express = require('express');

var Route = function(app, passport){

  var router = express.Router();
  var controller = require('./../controllers/results')();

  router.param('Result', controller.paramResult );
  router.param('format', controller.paramFormat );

  
  router.route('/api/v0/results.:format?')
    .all( controller.all )
    .get( controller.find )
    .post(controller.create );
  router.route('/api/v0/results/junit')
    .post(controller.createFromJunit );

  router.route('/api/v0/results/:Result.:format?')
    .all( controller.all )
    .get( controller.get )
    .put( controller.update )
    .delete( controller.remove );

  router.route('/api/v0/results/:Result/builds/:Index/download')
    .all( controller.all )
    .get( controller.buildDownload);
  
  app.use( router );
}

module.exports = Route;