/**
  Campaign Controller
*/

// native modules

// 3rd party modules
var mongoose = require('mongoose');

// own modules
var DefaultController = require('./');

var Controller = function () {
  var Campaign = mongoose.model('Campaign');
  var defaultCtrl = new DefaultController(Campaign, 'Campaign');

  this.paramFormat = defaultCtrl.format();
  this.paramCampaign = defaultCtrl.modelParam();

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
