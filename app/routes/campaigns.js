var express = require('express');

var Route = function(app, passport){

  var router = express.Router();
  var controller = require('./../controllers/campaigns')();

  router.param('Campaign', controller.paramCampaign );
  router.param('format', controller.paramFormat );

  
  router.route('/api/v0/campaigns.:format?')
    .all( controller.all )
    .get( controller.find )
    .post(controller.create );
  
  router.route('/api/v0/campaigns/:Campaign.:format?')
    .all( controller.all )
    .get( controller.get )
    .put( controller.update )
    .delete( controller.remove );
  
  app.use( router );
}

module.exports = Route;