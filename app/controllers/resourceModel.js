/**
  Campaign Controller
*/

// native modules

// 3rd party modules

// own modules
const DefaultController = require('./');

class TargetsController extends DefaultController {
  constructor() { super('Target'); }

  static getGt(req, res) {
    res.json(req.Target.toGt());
  }
}

module.exports = TargetsController;
