/**
  Testcases Controller
*/

// native modules
var request = require('request');

// 3rd party modules
var mongoose = require('mongoose');

// own modules
var DefaultController = require('./');

var Controller = function () {
  var Testcase = mongoose.model('Testcase');
  var defaultCtrl = new DefaultController(Testcase, 'testcase');

  this.paramFormat = defaultCtrl.format();
  this.paramTestcase = defaultCtrl.modelParam();

  this.all = (req, res, next) => {
    // dummy middleman function..
    next();
  };

  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = defaultCtrl.remove;

  this.download = (req, res) => {
    var tc = req.testcase.toObject();
    if (tc.files.length > 0) {
      res.attachment();
      var url = tc.files[0].href;
      request({
        followAllRedirects: true,
        url: url,
      }, (error, response, body) => {
        if (!error) {
          response.pipe(res);
        }
      });
    } else {
      res.status(404).json({ error: 'nothing to download' });
    }
  };

  return this;
};


module.exports = Controller;
