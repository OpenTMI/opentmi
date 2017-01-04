/**
  Builds Controller
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

  var Build = mongoose.model('Build');
  var defaultCtrl = new DefaultController(Build, 'Build');

  function randomIntInc (low, high) {
      return Math.floor(Math.random() * (high - low + 1) + low);
  }
  function randomText( list ){
    i = randomIntInc( 0, list.length-1 )
    return list[i]
  }

  //create dummy testcases when db is empty ->
  defaultCtrl.isEmpty( function(yes){
    if( yes === true ){
      var Template = {
        name: 'Build-',
        target: {
          type: 'simulate',
          hw: {
            platform: ''
          }
        }     
      }
      defaultCtrl.generateDummyData( function(i){
          var _new = {};
          _.extend(_new, Template)
          _new.name += i;
          _new.target.type = defaultCtrl.randomText(['simulate', 'hardware']);
          _new.target.hw.platform = 
            defaultCtrl.randomText(['K84F', 'nRF123', 'XBoard'])
          return _new;
      }, 10, function(err){
        //done
        if(err)console.log(err);
        else console.log('dummy build generated');
      });
    }
  });

  this.paramFormat = defaultCtrl.format();
  this.paramBuild = defaultCtrl.modelParam();

  this.all = function(req, res, next){
    // dummy middleman function..
    next(); 
  };
  
  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = defaultCtrl.remove;

  this.download = function(req, res) {
    req.Build.download( req.params.Index, res);
  };
  //util.inherits(this, defaultCtrl);

  return this;
}


module.exports = Controller;
