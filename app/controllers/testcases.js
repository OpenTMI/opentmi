/**
  Testcases Controller
*/

// native modules
const request = require('request');

// own modules
const DefaultController = require('./');
const ResultController = require('../controllers/results');

// Controller variables
const resultController = new ResultController();
const updateOptions = {
  upsert: true,
  runValidators: true,
  new: true
};

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

  upsert(req, res) {
    if (!req.body.tcid) {
      return res.status(400).json({error: 'Expected request body to contain a tcid property'});
    }

    return this._model.findOneAndUpdate({tcid: req.body.tcid}, req.body, updateOptions)
      .exec()
      .then((updatedTestcase) => {
        const statusCode = updatedTestcase.isNew ? 201 : 200;
        res.status(statusCode).json(updatedTestcase.toObject());
      }).catch((error) => {
        res.status(400).json({error: error.message});
      });
  }

  upsertAndAddResult(req, res) {
    const testcaseBody = req.body.testcase;
    const resultBody = req.body.result;

    if (!testcaseBody || !resultBody) {
      return res.status(400).json({error:
        'shortcut route for adding results to testcase needs both testcase and result properties'});
    }

    if (!testcaseBody.tcid) {
      return res.status(400).json({error: 'Expected testcase body to contain a tcid property'});
    }

    return this._model.findOneAndUpdate({tcid: req.body.tcid}, testcaseBody, updateOptions)
      .exec()
      .then(() => {
        if (!resultBody.tcid) {
          resultBody.tcid = testcaseBody.tcid;
        }

        req.body = resultBody;
        return resultController.create(req, res);
      })
      .catch((error) => {
        res.status(400).json({error: error.message});
      });
  }
}


module.exports = TestcasesController;
