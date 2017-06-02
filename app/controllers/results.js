/**
  Results Controller
*/

// native modules

// 3rd party modules
var mongoose = require('mongoose');
var colors = require('colors');
var JunitParser = require('junit-xml-parser').parser;
var uuid = require('node-uuid');
var async = require('async');
var winston = require('winston');

// own modules
var DefaultController = require('./');

var Controller = function () {
  var Result = mongoose.model('Result');
  var Testcase = mongoose.model('Testcase');
  var defaultCtrl = new DefaultController(Result, 'Result');

  this.paramFormat = defaultCtrl.format();
  this.paramResult = defaultCtrl.modelParam();

  this.all = (req, res, next) => {
    // dummy middleman function..
    next();
  };

  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = defaultCtrl.remove;

  Object.resolve = (path, obj, safe) => {
    return path.split('.').reduce((prev, curr) => {
      return !safe ? prev[curr] : (prev ? prev[curr] : undefined);
    }, obj || self); // self is undefined
  };

  defaultCtrl.on('create', (data) => {
    if (data.exec && data.exec.verdict === 'pass') {
      // Code below will not compile without some wacky magick \/ needs fix?
      //data.exec.duration
      //console.log("Got new "+"PASS".green+" result: "+data.tcid);
    } else {
      //console.log("Got new "+"FAIL".red+" result: "+data.tcid + "("+data._id+")");
    }

    var duration = Object.resolve('exec.duration', data, null);
    if (duration) {
      Testcase.updateTcDuration(data.tcid, duration);
    }
  });

  function streamToString(stream, cb) {
    var chunks = [];
    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    stream.on('end', () => {
      cb(chunks.join(''));
    });
  }

  function handleJunit(req, res) {
    JunitParser.parse(req.junit).then((results) => {
      var jobId = uuid.v1();
      function doResult(value, key, callback) {
        var result = new Result({
          tcid: value.name,
          cre: { name: 'tmt' },
          exec: {
            verdict: value.failure ? 'FAIL' : 'PASS',
            duration: value.time,
          },
          job: { id: jobId },
        });

        if (value.failure.message) result.exec.note = value.failure.message + "\n\n";
        if (value.failure.type) result.exec.note += value.failure.type + "\n\n";
        if (value.failure.raw) result.exec.note += value.failure.raw.join('\n');
        
        result.save(callback);
      }
      async.each(results.tests, doResult, (err) => {
        if (err) {
          winston.error(err);
          res.json({ err: err });
        } else {
          winston.info('Store new results');
          res.json({ ok: 1, message: "created " + results.tests.length + " results" });
        }
      });
    });
  }

  this.createFromJunit = (req, res) => {
    console.log("Got new Junit file");
    if (req.busboy) {
      req.busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        streamToString(file, (data) => {
          req.junit = data;
          try {
            handleJunit(req, res);
          } catch (e) {
            console.log(e);
            res.json({ error: e.toString() });
          }
        });
      });
    }
    req.pipe(req.busboy);
  };

  this.buildDownload = (req, res) => {
    req.Result.getBuild((err, build) => {
      build.download(req.params.Index, res);
    });
  };

  return this;
};


module.exports = Controller;
