var express = require('express');
var mongoose = require('mongoose');
var restify = require('express-restify-mongoose');
var _ = require('lodash');
var winston = require('winston');

var Route = function(app, passport){

  //easy way, but not support format -functionality..
  var Group = mongoose.model('Group');
  restify.serve(app, Group, {
    version: '/v0',
    name: 'groups',
    idProperty: '_id',
    protected: '__v',
  });
  Group.count({}, function(err, count){
    if(count===0){ 
      (new Group({name: 'admins', users: []})).save(); 
      (new Group({name: 'users', users: []})).save(); 
    }
  });
  Group.getUsers('admins', function(error, users){
    var admins = _.map(users, function(user){return user.name||user.displayName||user.email;})
    winston.info('Admin Users: '+admins.join(','));
  })
  
}

module.exports = Route;