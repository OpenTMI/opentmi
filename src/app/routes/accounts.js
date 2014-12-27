//3rd party modules
var express = require('express');
var mongoose = require('mongoose');
var restify = require('express-restify-mongoose');

var auth = require('./../../config/middlewares/authorization');

/**
 * Route middlewares
 */

var adminAuth = [auth.requiresLogin, auth.user.hasAuthorization];

var Route = function(app, passport){

  var Account = mongoose.model('User');
  restify.serve(app, Account, {
    version: '/v0',
    name: 'accounts',
    idProperty: 'username',
    protected: '__v,salt,hashed_password',
  });

  Account.count( {}, function(err, count){
    if(count===0 ) (new Account({
        username: 'admin', password: 'admin'
        ,email: 'admin@tmt.tmt'
      })).save( function(err, user){
        console.log(user);
        if(err)console.log(err);
    }); 
  });

  //create authentication routes:
  var controller = require('./../controllers/authentication')();
  
  app.post('/api/v0/login', 
      passport.authenticate('local'), controller.login );
  app.get('/api/v0/logout', controller.logout )
}

module.exports = Route;
