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

  upsert(req, res, next) {
    if (!req.body.tcid) {
      const error = new ReferenceError('Expected request body to contain a tcid property');
      error.statusCode = 400;
      return next(error);
    }

    return this._model.findOneAndUpdate({tcid: req.body.tcid}, req.body, updateOptions)
      .exec()
      .then((updatedTestcase) => {
        const statusCode = updatedTestcase.isNew ? 201 : 200;
        res.status(statusCode).json(updatedTestcase.toJSON());
      }).catch((error) => {
        const editedError = error;
        editedError.statusCode = 400;
        next(editedError);
      });
  }

  upsertAndResult(req, res, next) {
    const testcaseBody = req.body.testcase;
    const resultBody = req.body.result;

    if (!testcaseBody || !resultBody) {
      const error = new ReferenceError(
        'Shortcut route for adding results to testcase needs both testcase and result properties');
      error.statusCode = 400;
      return next(error);
    }

    if (!testcaseBody.tcid) {
      const error = new ReferenceError('Expected testcase body to contain a tcid property');
      error.statusCode = 400;
      return next(error);
    }

    if (!resultBody.tcid) {
      resultBody.tcid = testcaseBody.tcid;
    } else if (resultBody.tcid !== testcaseBody.tcid) {
      const error = new Error(
        `Expected testcase tcid to match result tcid, received tc:${testcaseBody.tcid} result:${resultBody.tcid}`);
      error.statusCode = 400;
      return next(error);
    }

    return this._model.findOneAndUpdate({tcid: req.body.tcid}, testcaseBody, updateOptions)
      .exec()
      .then((testcase) => {
        if (!resultBody.tcid) {
          resultBody.tcid = testcaseBody.tcid;
        }

        resultBody.tcRef = testcase._id;
        req.body = resultBody;
        return resultController.create(req, res, next);
      })
      .catch((error) => {
        const editedError = error;
        editedError.statusCode = 400;
        next(editedError);
      });
  }
}


module.exports = TestcasesController;
