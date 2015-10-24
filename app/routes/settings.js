var express = require('express');
var mongoose = require('mongoose');
var nconf = require('nconf');


var Route = function(app, passport){

  var router = express.Router();

  var isAdmin = function(req, res, next){
    var admin = nconf.get('admin');
      if( req.query.pwd && admin &&
          req.query.pwd === admin.pwd ){
        next();
      } else {
        res.status(500).json({error: 'Not allowed'});
      }
  } 
  
  router.route('/api/v0/settings.:format?')
    .all( isAdmin)
    .get( function(req, res){
      res.json( nconf.get() );
    })
    .put( function(req, res){
      //req.body
      res.json(501, {error: 'not implemented'});
    });
    
    app.use( router );
}

module.exports = Route;