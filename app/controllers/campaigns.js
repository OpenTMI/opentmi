/**
  Campaign Controller
*/

// native modules

// 3rd party modules
const mongoose = require('mongoose');

// own modules
const DefaultController = require('./');

class Controller extends DefaultController {
  constructor() {
    super(mongoose.model('Campaign'), 'Campaign');

    this.paramFormat = DefaultController.format();
    this.paramCampaign = this.modelParam();
  }
}


module.exports = Controller;
