/**
  Account Controller
*/

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');

//own modules
var DefaultController = require('./');


var Controller = function(){

  var Accounts = mongoose.model('User');
  var defaultCtrl = new DefaultController(Accounts, 'account');

  //create dummy testcases when db is empty ->
  defaultCtrl.isEmpty( function(yes){
    if( yes === true ){
      defaultCtrl.create({body: { name: 'admin' } } )
      console.log('admin account generated');
    }
  });

  this.paramAccount = defaultCtrl.modelParam(/* use default model name, account*/);

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
