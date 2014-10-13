var express = require('express');
var mongoose = require('mongoose');

var Route = function(app, passport){

  var router = express.Router();
  
  router.route('/api/v0/settings.:format?')
    .all( function(req, res, next){
      next();
    })
    .get( function(req, res){
      res.json( req );
    })
    
    app.use( router );
}

module.exports = Route;