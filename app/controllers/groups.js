/**
  Groups Controller
*/

// native modules

// 3rd party modules
var mongoose = require('mongoose');

// own modules
var DefaultController = require('./');

var Controller = function () {
  var Group = mongoose.model('Group');
  var defaultCtrl = new DefaultController(Group, 'Group');

  this.paramFormat = defaultCtrl.format();
  this.paramGroup = defaultCtrl.modelParam();

  this.all = (req, res, next) => {
    // dummy middleman function..
    next();
  };

  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = defaultCtrl.remove;

  return this;
};


module.exports = Controller;
