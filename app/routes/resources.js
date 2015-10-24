var express = require('express');

var Route = function(app, passport){

  var router = express.Router();
  var controller = require('./../controllers/resources')();

  router.param('Resource', controller.paramResource );
  router.param('format', controller.paramFormat );


  router.route('/api/v0/resources.:format?')
    .all( controller.all )
    .get( controller.find )
    .post(controller.create );
  
  router.route('/api/v0/resources/:Resource.:format?')
    .all( controller.all )
    .get( controller.get )
    .put( controller.update )
    .delete( controller.remove );

  router.route('/api/v0/resources/:Resource/device/build')
    .put( controller.setDeviceBuild )
  router.route('/api/v0/resources/:Resource/route')
    .get( controller.solveRoute )
  
  app.use( router );
}

module.exports = Route;