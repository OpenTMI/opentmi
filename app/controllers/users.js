/**
  Users Controller
*/

// 3rd party modules
var winston = require('winston');
var mongoose = require('mongoose');

// Own modules
var DefaultController = require('./');

function customRemove(req, res) {
  req.User.remove((err) => {
    if (err) {
      winston.error(err.message);
      return res.status(400).json({ error: err.message });
    }

    return res.status(200).json({});
  });
}

var Controller = function () {
  var User = mongoose.model('User');
  var defaultCtrl = new DefaultController(User, 'User');

  // Define route params
  this.paramFormat = DefaultController.format();
  this.paramUser = defaultCtrl.modelParam();

  // Define route connection points
  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = customRemove;

  return this;
};


module.exports = Controller;
