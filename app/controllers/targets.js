/**
  Campaign Controller
*/

//native modules
var util = require("util");

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');

var _ = require('lodash');

//own modules
var DefaultController = require('./');

var Controller = function(){

  var Campaign = mongoose.model('Target');
  var defaultCtrl = new DefaultController(Campaign, 'Target', 'name');

  //create dummy campaigns when db is empty ->
  defaultCtrl.isEmpty( function(yes){
    if( yes === true ){
      var Template = {
          name: 'K64F',
          yotta: [{
            target: "frdm-k64f-gcc",
            toolchain: "GCC_ARM"
          }],
          binary: {
            type: ".bin",
          },
          flash: {
            method: "cp",
            cycle_s: 4
          },
          reset: {
            method: "default"
          }
        }
      defaultCtrl.generateDummyData( function(i){
         var _new = {};
         _.extend(_new, Template)
          _new.name += i;
          return _new;
      }, 2, function(err){
        //done 
        if(err)console.log(err);
        else console.log('dummy Targets generated');
      });
    }
  });

  this.paramFormat = defaultCtrl.format();
  this.paramTarget = defaultCtrl.modelParam();

  this.all = function(req, res, next){
    // dummy middleman function..
    next(); 
  }
  
  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = defaultCtrl.remove;

  this.getGt = function(req, res){
    res.json(req.Target.toGt());
  }

  return this;
}


module.exports = Controller;
