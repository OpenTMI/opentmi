/**
  Results Controller
*/

//native modules
var util = require("util");

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');
var colors = require('colors');
var JunitParser = require('junit-xml-parser').parser;
var uuid = require('node-uuid');
var async = require('async');
var winston = require('winston');
var _ = require('lodash');
var nconf = require('nconf');

//own modules
var DefaultController = require('./');

var Controller = function(){

  var Result = mongoose.model('Result');
  var Testcase = mongoose.model('Testcase')
  var defaultCtrl = new DefaultController(Result, 'Result');

  if( nconf.get('seeds') ){
    //create dummy testcases when db is empty ->
    defaultCtrl.isEmpty( function(yes){
      if( yes === true ){
        var Template = {
            tcid: 'Testcase-',
            cre: { name: 'tmi'},
            job: {
              id: ''
            },
            exec: {
              verdict: 'pass',
              framework: { name: 'clitest', ver: '0.0'},
              dut: {
                vendor: 'atmel',
                build: {
                  branch: 'master',
                  commitId: 'abc12345678901234567'
                }
              },
              sut: {
                cut: ['fea-1']
              }
            }
          }
        defaultCtrl.generateDummyData( function(i){
           var _new = {};
           _.extend(_new, Template)
            _new.tcid += i;
            _new.job.id = 'test-job-'+defaultCtrl.randomText(['A','B', 'C']);
            _new.exec.verdict = defaultCtrl.randomText(['pass','fail']);
            _new.exec.duration = defaultCtrl.randomIntInc(0, 500);
            return _new;
        }, 1000, function(err){
          //done
          if(err)console.log(err);
          else console.log('dummy result generated');
        });
      }
    });
  }

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

  Object.resolve = function(path, obj, safe) {
        return path.split('.').reduce(function(prev, curr) {
            return !safe ? prev[curr] : (prev ? prev[curr] : undefined)
        }, obj || self)
    }

  defaultCtrl.on('create', function(data){
    if( data.exec && data.exec.verdict === 'pass' ) {
      //data.exec.duration
      console.log("Got new "+"PASS".green+" result: "+data.tcid);
    } else {
      console.log("Got new "+"FAIL".red+" result: "+data.tcid + "("+data._id+")");
    }
    duration =  Object.resolve('exec.duration', data, null);
    if( duration ) {
      Testcase.updateTcDuration(data.tcid, duration);
    }
  });

  function streamToString(stream, cb) {
      const chunks = [];
      stream.on('data', function(chunk){
        chunks.push(chunk);
      });
      stream.on('end', function(){
        cb(chunks.join(''));
      });
  }
  function handleJunit(req, res) {
      JunitParser.parse(req.junit).then(function(results) {
      var jobId = uuid.v1();
      function doResult(value, key, callback) {
        var result = new Result({
            tcid: value.name,
            cre: { name: 'tmt'},
            exec: {
              verdict: value.failure ? 'FAIL' : 'PASS',
              duration: value.time
            },
            job: {id: jobId},
        });
        if( value.failure.message ) result.exec.note = value.failure.message+"\n\n";
        if( value.failure.type )result.exec.note += value.failure.type+"\n\n";
        if( value.failure.raw )  result.exec.note += value.failure.raw.join('\n');
        result.save(callback);
      }
      async.each( results.tests, doResult, function(err) {
          if(err) {
              winston.error(err);
              res.json({err: err});
          } else {
            winston.info('Store new results');
            res.json({ok: 1, message: "created "+results.tests.length + " results"} );
          }
      });

    });
  }
  this.createFromJunit = function(req, res) {
    console.log("Got new Junit file");
    if (req.busboy) {
        req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
            streamToString(file, function(data) {
                req.junit = data;
                try {
                    handleJunit(req, res);
                } catch(e) {
                    console.log(e);
                    res.json({error: e.toString()});
                }
            });
        });
    }
    req.pipe(req.busboy);
  };

  this.buildDownload = function(req, res) {
    req.Result.getBuild( (err, build) => {
      build.download( req.params.Index, res);
    });

  };

  //util.inherits(this, defaultCtrl);
  return this;
}


module.exports = Controller;
