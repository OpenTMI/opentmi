var express = require('express');

var Route = function(app, passport){

  var router = express.Router();
  var controller = require('./../controllers/resources')();

  router.param('Resource', controller.paramResource );
  router.param('format', controller.paramFormat );
  router.param('Alloc', controller.paramAlloc );

  router.route('/api/v0/resources.:format?')
    .all( controller.all )
    .get( controller.find )
    .post(controller.create );


  router.route('/api/v0/resources/allocation')
    //.get( controller.list_allocs )
    .put( controller.allocMultiple )

  //router.route('/api/v0/resources/allocation/:Alloc')
  //  .get( controller.list_alloc_resources );
  
  router.route('/api/v0/resources/allocation/:Alloc/release')
    .put( controller.releaseMultiple );

  router.route('/api/v0/resources/:Resource.:format?')
    .all( controller.all )
    .get( controller.get )
    .put( controller.update )
    .delete( controller.remove );

  router.route('/api/v0/resources/:Resource/alloc')
    .put( controller.alloc );

  router.route('/api/v0/resources/:Resource/release')
    .put( controller.release );

  router.route('/api/v0/resources/:Resource/device/build')
    .put( controller.setDeviceBuild )
  router.route('/api/v0/resources/:Resource/route')
    .get( controller.solveRoute )
  
  app.use( router );
}

module.exports = Route;