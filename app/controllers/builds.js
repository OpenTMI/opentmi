/**
  Builds Controller
*/

// native modules

// 3rd party modules
var mongoose = require('mongoose');

// own modules
var DefaultController = require('./');

var Controller = function () {
  var Build = mongoose.model('Build');
  var defaultCtrl = new DefaultController(Build, 'Build');

  this.paramFormat = DefaultController.format();
  this.paramBuild = defaultCtrl.modelParam();

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
    req.Build.download(req.params.Index, res);
  };

  return this;
};


module.exports = Controller;
