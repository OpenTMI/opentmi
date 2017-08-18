/**
  Testcases Controller
*/

// native modules
const request = require('request');

// own modules
const DefaultController = require('./');

// Controller variables
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
}


module.exports = TestcasesController;
