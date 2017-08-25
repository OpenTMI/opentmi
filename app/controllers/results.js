/**
  Results Controller
*/

// native modules

// 3rd party modules
require('colors');
const Promise = require('bluebird');
const mongoose = require('mongoose');
const JunitXmlParser = require('junit-xml-parser').parser;
const uuid = require('uuid/v1');
const logger = require('../tools/logger');

// Setup
mongoose.Promise = Promise;

// own modules
const DefaultController = require('./');

class ResultsController extends DefaultController {
  constructor() {
    super('Result');

    this.Testcase = mongoose.model('Testcase');

    const self = this;
    Object.resolve = (path, obj, safe) => path.split('.').reduce((prev, curr) => {
      if (!safe) { return prev[curr]; }
      return (prev ? prev[curr] : undefined);
    }, obj || self); // self is undefined

    this.on('create', (data) => {
      if (data.exec && data.exec.verdict === 'pass') {
        // data.exec.duration
        logger.info(`Got new ${'PASS'.green} result: ${data.tcid}`);
      } else {
        logger.info(`Got new ${'FAIL'.red} result: ${data.tcid}`);
      }

      const duration = Object.resolve('exec.duration', data, null);
      if (duration) {
        this.Testcase.updateTcDuration(data.tcid, duration);
      }
    });
  }

  static streamToString(stream) {
    return new Promise((resolve) => {
      const chunks = [];
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      stream.on('end', () => {
        resolve(chunks.join(''));
      });
    });
  }

  _doResult(jobId, value) {
    const result = new this.Model({
      tcid: value.name,
      cre: {name: 'tmt'},
      exec: {
        verdict: value.failure ? 'fail' : 'pass',
        duration: value.time
      },
      job: {id: jobId}
    });

    if (value.failure.message) result.exec.note = `${value.failure.message}\n\n`;
    if (value.failure.type) result.exec.note += `${value.failure.type}\n\n`;
    // if (value.failure.raw) result.exec.note += value.failure.raw.join('\n');

    return result.save();
  }

  handleJunitXml(junitXml) {
    return JunitXmlParser.parse(junitXml).then((results) => {
      const jobId = uuid();

      return Promise.each(results.suite.tests, this._doResult.bind(this, jobId)).then(() => {
        logger.info('Store new results');
        return Promise.resolve({ok: 1, message: `created ${results.suite.tests.length} results`});
      });
    });
  }

  createFromJunitXml(req, res) {
    logger.info('Got new Junit file');
    return new Promise((resolve, reject) => {
      if (req.busboy) {
        req.busboy.on('file', (fieldname, file) => {
          this.streamToString(file).then((data) => {
            this.handleJunitXml(data).then((value) => {
              resolve(value);
            });
          }).catch((err) => {
            res.status(400).json({error: err.message});
            reject(err);
          });
        });
      }
      // req.pipe(req.busboy);
    });
  }

  static buildDownload(req, res) {
    req.Result.getBuild((err, build) => {
      build.download(req.params.Index, res);
    });
  }
}


module.exports = ResultsController;
