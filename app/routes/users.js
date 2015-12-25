//3rd party modules
var express = require('express');
var mongoose = require('mongoose');

var auth = require('./../../config/middlewares/authorization');

/**
 * Route middlewares
 */

var Route = function(app){

  var User = mongoose.model('User');
  if( 0 ){
    User.count( {}, function(err, count){
      if(count===0 ) (new User({
          username: 'admin', password: 'admin'
          ,email: 'admin@opentmi.com'
        })).save( function(err, user){
          console.log(user);
          if(err)console.log(err);
      }); 
    });
  }

  //create authentication routes:
  var controller = require('./../controllers/authentication')();

  /*
  api.get('/api/v0/keys', apiKeys.keys);
  api.get('/api/v0/accounts/:Account/keys', apiKeys.userKeys);
  api.get('/api/v0/accounts/:Account/keys/new', apiKeys.createKey)
  api.delete('/api/v0/accounts/:Account/keys/:Key', apiKeys.deleteKey);
  */
  
  app.post('/auth/login', controller.login );
  app.get('/auth/me', auth.ensureAuthenticated, controller.getme );  
  app.put('/auth/me', auth.ensureAuthenticated, controller.putme );
  app.post('/auth/signup', controller.signup );
  app.post('/auth/logout', controller.logout );
  app.post('/auth/github', controller.github );
  app.post('/auth/google', controller.google );
}

module.exports = Route;
