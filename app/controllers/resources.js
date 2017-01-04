/**
  Results Controller
*/

//native modules
var util = require("util");

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');
var async = require('async');
var _ = require('lodash');

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

  this.setDeviceBuild = function(req, res){
    req.Resource.setDeviceBuild(req.body.build);
    res.redirect('/api/v0/resources/'+req.params.Resource);
  }
  this.solveRoute = function(req, res){
    req.Resource.solveRoute(function(error, route){
      res.json(route);
    });
  }

  this.paramAlloc = function(req, res, next, id){
    Resource.find( {'status.allocId': req.params.Alloc}, function(error, docs){
      if(error) {
        res.status(404).json({error: error});
      } else if( docs.length > 0 ){
        console.log("found many devices: "+docs.length);
        req.allocated = docs;
        next();
      } else {
        console.log('not found allocated resources with id: '+req.params.Alloc);
        res.status(404).json({error: 'not found'});
      }
    })
  }
  this.getToBody = function(req, res, next) {
    try{
      req.body = JSON.parse( req.query.alloc );
    } catch(err){
      res.status(500).json({error: err});
      return;
    }
    next();
  }
  this.alloc = function(re, res){
    req.Resource.alloc( function(error, doc){
      if( error ) {
        res.status(500).json(error);
      } else {
        res.json(allocated);
      }
    })
  }
  this.release = function(re, res){
    req.Resource.release( function(error, doc){
      if( error ) {
        res.status(500).json(error);
      } else {
        res.json(allocated);
      }
    })
  }
  this.allocMultiple = function(req, res){
    Resource.allocateResources(req.body, function(error, allocated){
      if( error ) {
        res.status(404).json(error);
      } else {
        res.json(allocated);
      }
    })
  }
  this.releaseMultiple = function(req, res){
    console.log('Releasing: '+req.allocated.length);
    async.map( req.allocated, 
      function(resource, cb){
        console.log('try to release: '+resource._id);
        resource.release(cb)
      },
      function(error, results){
        if(error){

        } else {
          res.json(results);
        }
      }
    )
  }

  //util.inherits(this, defaultCtrl);

  return this;
}


module.exports = Controller;
