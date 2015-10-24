var express = require('express');

var Route = function(app, passport){

  var router = express.Router();
  var controller = require('./../controllers/testcases')();

  router.param('testcase', controller.paramTestcase );
  router.param('format', controller.paramFormat );

  router.route('/api/v0/testcases.:format?')
    .all( controller.all )
    .get( controller.find )
    .post(controller.create );
  
  router.route('/api/v0/testcases/:testcase.:format?')
    .all( controller.all )
    .get( controller.get )
    .put( controller.update )
    .delete( controller.remove );

  router.route('/api/v0/testcases/:testcase/download')
    .all( controller.all )
    .get( controller.download );
  
  app.use( router );
}

module.exports = Route;