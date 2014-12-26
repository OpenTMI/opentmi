/**
  Groups Controller
*/

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');

//own modules
var DefaultController = require('./');


var Controller = function(){

  var Group = mongoose.model('Group');
  var defaultCtrl = new DefaultController(Group, 'group');

  //create dummy groups when db is empty ->
  defaultCtrl.isEmpty( function(yes){
    if( yes === true ){
      defaultCtrl.create({body: {name: 'admins', users: ['admin']}});
      defaultCtrl.create({body: {name: 'users', users: ['admin']}});
    }
  });

  this.paramFormat = defaultCtrl.format();
  this.paramGroup = defaultCtrl.modelParam();

  this.all = function(req, res, next){
    // dummy middleman function..
    next(); 
  }
  
  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = defaultCtrl.remove;

  return this;
}


module.exports = Controller;
