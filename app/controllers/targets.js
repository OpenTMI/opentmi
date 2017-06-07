/**
  Campaign Controller
*/

// native modules

// 3rd party modules
var mongoose = require('mongoose');

// own modules
var DefaultController = require('./');

var Controller = function () {
  var Campaign = mongoose.model('Target');
  var defaultCtrl = new DefaultController(Campaign, 'Target', 'name');

  this.paramFormat = defaultCtrl.format();
  this.paramTarget = defaultCtrl.modelParam();

  this.all = (req, res, next) => {
    // dummy middleman function..
    next();
  };

  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = defaultCtrl.remove;

  this.getGt = (req, res) => {
    res.json(req.Target.toGt());
  };

  return this;
};


module.exports = Controller;
