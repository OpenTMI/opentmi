var express = require('express');
var mongoose = require('mongoose');
var restify = require('express-restify-mongoose');

var Route = function(app, passport){

  //easy way, but not support format -functionality..
  var Group = mongoose.model('Group');
  restify.serve(app, Group, {
    version: '/v0',
    name: 'groups',
    idProperty: '_id',
    protected: '__v',
  });

  Group.count( {}, function(err, count){
    if(count===0){ 
      (new Group({name: 'admins', users: ['admin']})).save(); 
      (new Group({name: 'users', users: ['admin']})).save(); 
    }
  });
}

module.exports = Route;