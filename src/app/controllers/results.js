/**
  Results Controller
*/

//native modules
var util = require("util");

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');

//own modules
var DefaultController = require('./');

var Controller = function(){

  var Result = mongoose.model('Result');
  var defaultCtrl = new DefaultController(Result, 'Result');


  //create dummy testcases when db is empty ->
  defaultCtrl.isEmpty( function(yes){
    if( yes === true ){
      var Template = {
          tcid: 'Result-',
          cre: { user: 'tmt'},
          verdict: 'fail'
        }
      var _ = require('underscore');
      defaultCtrl.generateDummyData( function(i){
         var _new = {};
         _.extend(_new, Template)
          _new.tcid += i;
          return _new;
      }, 10, function(err){
        //done
        if(err)console.log(err);
        else console.log('dummy result generated');
      });
    }
  });

  this.paramFormat = defaultCtrl.format();
  this.paramResult = defaultCtrl.modelParam();

  this.all = function(req, res, next){
    // dummy middleman function..
    next(); 
  }
  
  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = defaultCtrl.remove;
  

  //util.inherits(this, defaultCtrl);

  return this;
}


module.exports = Controller;
