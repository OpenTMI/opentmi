var express = require('express');

var Route = function(app, passport){

  var router = express.Router();
  var controller = require('./../controllers/groups.js')();
  
  router.param('group', controller.paramGroup );

  router.route('/api/v0/groups.:format?')
    .all( controller.all )
    .get( controller.find )
    .post(controller.create );

  router.route('/api/v0/groups/:group.:format?')
    .all( controller.all )
    .get( controller.get )
    .put( controller.update )
    .delete( controller.remove );
    app.use( router );
}

module.exports = Route;