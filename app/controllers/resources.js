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

  var Resource = mongoose.model('Resource');
  var defaultCtrl = new DefaultController(Resource, 'Resource');

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
          name: 'DUT-',
          cre: { user: 'tmt'},
          type: 'dut',
          usage: {type: 'automation'},
          status: {  value: 'active' },
          other_info: { location: { site: 'Oulu'}, group: 'department' },
          device: { 
            manufacturer: 'Atmel',
            model: 'sam4eXplained',
            sn: '123568',
            build: '5213'
          }
        }
      var _ = require('underscore');
      defaultCtrl.generateDummyData( function(i){
         var _new = {};
         _.extend(_new, Template)
          _new.name += i;
          _new.device.sn += i
          return _new;
      }, 10, function(err){
        //done
        if(err)console.log(err);
        else console.log('dummy resource generated');
      });
    }
  });

  this.paramFormat = defaultCtrl.format();
  this.paramResource = defaultCtrl.modelParam();

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
