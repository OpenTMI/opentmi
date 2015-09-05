/**
  Campaign Controller
*/

//native modules
var util = require("util");

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');

//own modules
var DefaultController = require('./');

var Controller = function(){

  var Campaign = mongoose.model('Campaign');
  var defaultCtrl = new DefaultController(Campaign, 'Campaign');

  function randomIntInc (low, high) {
      return Math.floor(Math.random() * (high - low + 1) + low);
  }
  function randomText( list ){
    i = randomIntInc( 0, list.length-1 )
    return list[i]
  }

  //create dummy campaigns when db is empty ->
  defaultCtrl.isEmpty( function(yes){
    console.log('create dummy campaigns..');
    if( yes === true ){
      var Template = {
          name: 'Campaign-',
          cre: { user: 'tmt'},
          tcs: JSON.stringify({})
        }
      var _ = require('underscore');
      defaultCtrl.generateDummyData( function(i){
         var _new = {};
         _.extend(_new, Template)
          _new.name += i;
          return _new;
      }, 2, function(err){
        //done 
        if(err)console.log(err);
        else console.log('dummy campaign generated');
      });
    }
  });

  this.paramFormat = defaultCtrl.format();
  this.paramCampaign = defaultCtrl.modelParam();

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
