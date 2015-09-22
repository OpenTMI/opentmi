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
          cre: { name: 'tmt'},
          exec: { 
            verdict: 'pass', 
            framework: { name: 'clitest', ver: '0.0'},
            dut: {
              vendor: 'atmel',
              build: {
                branch: 'master',
                commitId: 'abc12345678901234567'
              }
            }
          }
        }
      var _ = require('underscore');
      defaultCtrl.generateDummyData( function(i){
         var _new = {};
         _.extend(_new, Template)
          _new.tcid += i;
          _new.exec.verdict = defaultCtrl.randomText(['pass','fail']);
          _new.exec.duration = defaultCtrl.randomIntInc(0, 500);
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

  defaultCtrl.on('create', function(data){
    if( data.verdict && data.verdict.final === 'pass' ) {
      //data.exec.duration
      console.log("Got new PASS result: "+data.tcid);
    } else {
      console.log("Got new FAIL result: "+data.tcid);
    }
  });
  

  //util.inherits(this, defaultCtrl);

  return this;
}


module.exports = Controller;
