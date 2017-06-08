/**
  Testcases Controller
*/

// native modules
const request = require('request');

// 3rd party modules
const mongoose = require('mongoose');

// own modules
const DefaultController = require('./');

class Controller extends DefaultController {
  constructor() {
    super(mongoose.model('Testcase'), 'Testcase');

    this.paramFormat = DefaultController.format();
    this.paramTestcase = this.modelParam();
  }

  download(req, res) {
    const tc = req.testcase.toObject();
    if (tc.files.length > 0) {
      res.attachment();
      const url = tc.files[0].href;
      request({
        followAllRedirects: true,
        url,
      }, (error, response, body) => {
        if (!error) {
          response.pipe(res);
        }
      });
    } else {
      res.status(404).json({ error: 'nothing to download' });
    }
  }
}


module.exports = Controller;
