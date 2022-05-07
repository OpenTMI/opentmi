/**
  Testcases Controller
*/

// native modules
const request = require('request');

// 3rd party modules

// own modules
const DefaultController = require('.');

class TestcasesController extends DefaultController {
  constructor() { super('Testcase'); }

  download(req, res) { // eslint-disable-line class-methods-use-this
    const tc = req.testcase.toObject();
    if (tc.files.length > 0) {
      res.attachment();
      const url = tc.files[0].href;
      request({
        followAllRedirects: true,
        url
      }, (error, response) => {
        if (!error) {
          response.pipe(res);
        }
      });
    } else {
      res.status(404).json({error: 'nothing to download'});
    }
  }
}

module.exports = TestcasesController;
