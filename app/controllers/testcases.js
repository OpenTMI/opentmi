/**
  Testcases Controller
*/

//native modules
var util = require("util");
var request = require('request');

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');
var _ = require('lodash');
var nconf = require('nconf');

//own modules
var DefaultController = require('./');

var Controller = function(){

  var Testcase = mongoose.model('Testcase');
  var defaultCtrl = new DefaultController(Testcase, 'testcase');

  if( nconf.get('seeds') ){
    //create dummy testcases when db is empty ->
    defaultCtrl.isEmpty( function(yes){
      return;
      if( yes === true ){
        var Template = {
            tcid: 'Testcase-',
            cre: { name: 'tmt'},
            owner: { name: 'nobody'},
            other_info: {
              title: 'Example case',
              purpose: 'dummy' }
          }

        defaultCtrl.generateDummyData( function(i){
            var _new = {execution: { estimation: {} }};
            _.extend(_new, Template);
            _new.other_info.type =  defaultCtrl.randomText(['smoke','regression']),
            _new.other_info.components = [defaultCtrl.randomText(['ALU1','ALU2'])],
            _new.status = {
              value: defaultCtrl.randomText(['unknown', 'released', 'maintenance'])
            };
            _new.execution.estimation.duration = defaultCtrl.randomIntInc(10, 120)
            _new.tcid += i;
            return _new;
        }, 1000, function(err){
          //done
          if(err)console.log(err);
          else console.log('dummy testcases generated');
        });
      }
    });
  }

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

  this.download = function(req, res) {
    tc = req.testcase.toObject();
    if( tc.files.length > 0 ){
      res.attachment();
      var url = tc.files[0].href;
      request({
        followAllRedirects: true,
        url: url
      }, function (error, response, body) {
        if (!error) {
          response.pipe(res );
        }
      });
    } else {
      res.status(404).json({error: 'nothing to download'});
    }
  }

  //util.inherits(this, defaultCtrl);

  return this;
}


module.exports = Controller;
