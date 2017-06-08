/**
  Builds Controller
*/

// native modules

// 3rd party modules
const mongoose = require('mongoose');

// own modules
const DefaultController = require('./');

class Controller extends DefaultController {
  constructor() {
    super(mongoose.model('Build'), 'Build');

    this.paramFormat = DefaultController.format();
    this.paramBuild = this.modelParam();
  }

  static download(req, res) {
    req.Build.download(req.params.Index, res);
  }
}


module.exports = Controller;
