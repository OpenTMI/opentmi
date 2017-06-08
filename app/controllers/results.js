/**
  Results Controller
*/

// native modules

// 3rd party modules
const mongoose = require('mongoose');
const colors = require('colors');
const JunitParser = require('junit-xml-parser').parser;
const uuid = require('node-uuid');
const async = require('async');
const winston = require('winston');

// own modules
const DefaultController = require('./');

class Controller extends DefaultController {
  constructor() {
    super(mongoose.model('Result'), 'Result');

    this.Testcase = mongoose.model('Testcase');
    this.paramFormat = DefaultController.format();
    this.paramResult = this.modelParam();

    const self = this;
    Object.resolve = (path, obj, safe) => {
      return path.split('.').reduce((prev, curr) => {
        return !safe ? prev[curr] : (prev ? prev[curr] : undefined);
      }, obj || self); // self is undefined
    };

    this.on('create', (data) => {
      if (data.exec && data.exec.verdict === 'pass') {
        // Code below will not compile without some wacky magick \/ needs fix?
        //data.exec.duration
        //console.log("Got new "+"PASS".green+" result: "+data.tcid);
      } else {
        //console.log("Got new "+"FAIL".red+" result: "+data.tcid + "("+data._id+")");
      }

      const duration = Object.resolve('exec.duration', data, null);
      if (duration) {
        this.Testcase.updateTcDuration(data.tcid, duration);
      }
    });
  }

  static streamToString(stream, cb) {
    const chunks = [];
    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    stream.on('end', () => {
      cb(chunks.join(''));
    });
  }

  static handleJunit(req, res) {
    JunitParser.parse(req.junit).then((results) => {
      const jobId = uuid.v1();
      function doResult(value, key, callback) {
        const result = new this.Model({
          tcid: value.name,
          cre: { name: 'tmt' },
          exec: {
            verdict: value.failure ? 'FAIL' : 'PASS',
            duration: value.time,
          },
          job: { id: jobId },
        });

        if (value.failure.message) result.exec.note = value.failure.message + "\n\n";
        if (value.failure.type) result.exec.note += value.failure.type + "\n\n";
        if (value.failure.raw) result.exec.note += value.failure.raw.join('\n');

        result.save(callback);
      }
      async.each(results.tests, doResult, (err) => {
        if (err) {
          winston.error(err);
          res.json({ err });
        } else {
          winston.info('Store new results');
          res.json({ ok: 1, message: `created ${results.tests.length} results` });
        }
      });
    });
  }

  static createFromJunit(req, res) {
    console.log('Got new Junit file');
    if (req.busboy) {
      req.busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        Controller.streamToString(file, (data) => {
          req.junit = data;
          try {
            Controller.handleJunit(req, res);
          } catch (e) {
            console.log(e);
            res.json({ error: e.toString() });
          }
        });
      });
    }
    req.pipe(req.busboy);
  }

  static buildDownload(req, res) {
    req.Result.getBuild((err, build) => {
      build.download(req.params.Index, res);
    });
  }
}


module.exports = Controller;
