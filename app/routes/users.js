//3rd party modules
var express = require('express');
var mongoose = require('mongoose');
var nconf = require('nconf');
var restify = require('express-restify-mongoose');



var auth = require('./../../config/middlewares/authorization');

/**
 * Route middlewares
 */

var Route = function(app){

  var User = mongoose.model('User');
  User.count( {}, function(err, count){
    if(count===0 ){
      var admin = new User();
      admin.name = nconf.get('admin').user;
      admin.password = nconf.get('admin').pwd;
      admin.save( function(err, user){
        if(err)return console.log(err);
        else {
          user.addToGroup('admins', function(error, user){
            if( error ) {
              console.log(error);
            } else {
              console.log(user);
            }
          });
        }
      });
    }
  });

  restify.serve(app, User, {
    version: '/v0',
    name: 'users',
    idProperty: '_id',
    protected: '__v,password',
  });
  

  //create authentication routes:
  var controller = require('./../controllers/authentication')();
  var apiKeys = require('./../controllers/apikeys');
  app.get('/api/v0/apikeys', auth.ensureAdmin, apiKeys.keys);
  app.get('/api/v0/users/:User/apikeys', auth.ensureAuthenticated, apiKeys.userKeys);
  app.get('/api/v0/users/:User/apikeys/new', auth.ensureAuthenticated, apiKeys.createKey)
  app.delete('/api/v0/users/:User/apikeys/:Key', auth.ensureAuthenticated, apiKeys.deleteKey);
  
  
  app.post('/auth/login', controller.login );
  app.get('/auth/me', auth.ensureAuthenticated, controller.getme );  
  app.put('/auth/me', auth.ensureAuthenticated, controller.putme );
  app.post('/auth/signup', controller.signup );
  app.post('/auth/logout', controller.logout );
  app.post('/auth/github', controller.github );
  app.post('/auth/google', controller.google );
}

module.exports = Route;
