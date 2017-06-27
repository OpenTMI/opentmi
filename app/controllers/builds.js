/**
  Builds Controller
*/

// native modules

// 3rd party modules

// own modules
const DefaultController = require('./');

class BuildsController extends DefaultController {
  constructor() { super('Build'); }

  static download(req, res) {
    req.Build.download(req.params.Index, res);
  }
}


module.exports = BuildsController;
