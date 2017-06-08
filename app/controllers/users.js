/**
  Users Controller
*/

// 3rd party modules
const winston = require('winston');
const mongoose = require('mongoose');

// Own modules
const DefaultController = require('./');

function customRemove(req, res) {
  req.User.remove((err) => {
    if (err) {
      winston.error(err.message);
      return res.status(400).json({ error: err.message });
    }

    return res.status(200).json({});
  });
}

class Controller extends DefaultController {
  constructor() {
    super(mongoose.model('User'), 'User');

    // Define route params
    this.paramFormat = DefaultController.format();
    this.paramUser = this.modelParam();
  }

  // Define route connection points
  remove(req, res) { customRemove(req, res); }
}


module.exports = Controller;
