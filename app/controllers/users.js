/**
  Users Controller 
*/

//3rd party modules
var winston = require('winston');
var express = require('express');
var mongoose = require('mongoose');

//own modules
var DefaultController = require('./');

var Controller = function() {
  var User = mongoose.model('User');
  var defaultCtrl = new DefaultController(User, 'User');

  // Define route params
  this.paramFormat = defaultCtrl.format();
  this.paramUser = defaultCtrl.modelParam();
  
  // Define route connection points
  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = defaultCtrl.remove;

  return this;
}

module.exports = Controller;
