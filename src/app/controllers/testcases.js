/**
  Testcases Controller
*/

//native modules
var util = require("util");

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');

//own modules
var DefaultController = require('./');

var Controller = function(){

  var Testcase = mongoose.model('Testcase');
  var defaultCtrl = new DefaultController(Testcase, 'testcase');


  //create dummy testcases when db is empty ->
  defaultCtrl.isEmpty( function(yes){
    if( yes === true ){
      var Template = {
          tcid: 'Testcase-',
          cre: { user: 'tmt'},
          owner: { user: 'nobody'},
          other_info: { title: 'Example case', purpose: 'dummy' },
          status: {value: 'unknown'}
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
        else console.log('dummy testcases generated');
      });
    }
  });

  this.paramFormat = defaultCtrl.format();
  this.paramTestcase = defaultCtrl.modelParam();

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
