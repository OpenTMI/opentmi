/*!
 * Module dependencies
 */

// Third party modules
const mongoose = require('mongoose');
// var userPlugin = require('mongoose-user');
const QueryPlugin = require('mongoose-query');
const logger = require('../tools/logger');
const _ = require('lodash');

// Local components
const FileSchema = require('./extends/file');
const tools = require('../tools');

const Schema = mongoose.Schema;
const checksum = tools.checksum;
const filedb = tools.filedb;
const fileProvider = filedb.provider;
const Build = mongoose.model('Build');

FileSchema.add({
  ref: {
    type: Schema.Types.ObjectId,
    ref: 'Resource'
  },
  from: {
    type: String,
    enum: ['dut', 'framework', 'env', 'other']
  }
});

/**
 * User schema
 */
const ResultSchema = new Schema({
  tcid: {type: String, required: true, index: true},
  tcRef: {type: Schema.Types.ObjectId, ref: 'Testcase'},
  job: {
    id: {type: String, default: ''}
  },
  campaign: {type: String, default: '', index: true},
  campaignRef: {type: Schema.Types.ObjectId, ref: 'Campaign'},
  cre: {
    time: {type: Date, default: Date.now, index: true},
    user: {type: String},
    userRef: {type: Schema.Types.ObjectId, ref: 'User'}
  },
  exec: {
    verdict: {
      type: String,
      required: true,
      enum: ['pass', 'fail', 'inconclusive', 'blocked', 'error'],
      index: true
    },
    note: {type: String, default: ''},
    duration: {type: Number}, // seconds
    profiling: {type: Schema.Types.Mixed},
    env: { // environment information
      ref: {type: Schema.Types.ObjectId, ref: 'Resource'},
      rackId: {type: String},
      framework: {
        name: {type: String, default: ''},
        ver: {type: String, default: ''}
      }
    },
    sut: { // software under test
      ref: {type: Schema.Types.ObjectId, ref: 'Build'},
      gitUrl: {type: String, default: ''},
      buildName: {type: String},
      buildDate: {type: Date},
      buildUrl: {type: String, default: ''},
      buildSha1: {type: String},
      branch: {type: String, default: ''},
      commitId: {type: String, default: ''},
      tag: [{type: String}],
      href: {type: String},
      cut: [{type: String}], // Component Under Test
      fut: [{type: String}] // Feature Under Test
    },
    dut: { // Device(s) Under Test
      count: {type: Number},
      type: {type: String, enum: ['hw', 'simulator', 'process']},
      ref: {type: Schema.Types.ObjectId, ref: 'Resource'},
      vendor: {type: String},
      model: {type: String},
      ver: {type: String},
      sn: {type: String}
    },
    logs: [FileSchema]
  }
});

ResultSchema.set('toObject', {virtuals: true});

/**
 * Query plugin
 */
ResultSchema.plugin(QueryPlugin); // install QueryPlugin

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */
ResultSchema.pre('validate', function preValidate(next) {
  let error;
  const buildSha1 = _.get(this, 'exec.sut.buildSha1');

  const logs = _.get(this, 'exec.logs');
  if (Array.isArray(logs)) {
    for (let i = 0; i < logs.length; i += 1) {
      const file = logs[i];
      if (!file.name) {
        error = new Error(`file[${i}].name missing`);
        break;
      }

      if (!file.data) {
        logger.warn(`file[${i}].data missing`);
        file.data = '';
        // error = new Error(`file[${i}].data missing`);
        // break;
      }

      if (file.base64) {
        file.data = new Buffer(file.base64, 'base64');
        file.base64 = undefined;
      }

      file.size = file.data.length;
      file.sha1 = checksum(file.data, 'sha1');
      file.sha256 = checksum(file.data, 'sha256');

      if (fileProvider === 'mongodb') {
        // use mongodb document
        logger.warn('store file %s to mongodb', file.name);
      } else if (fileProvider) {
        // store to filesystem
        filedb.storeFile(file)
          .then(() => {
            logger.silly(`File ${file.name} stored`);
          })
          .catch((storeError) => {
            logger.warn(storeError);
          });
        file.data = undefined;
      } else {
        // do not store at all..
        file.data = undefined;
        logger.warn('filedb is not configured');
      }
    }
  }

  if (error) {
    return next(error);
  }

  if (buildSha1) {
    logger.debug('result build sha1: ', buildSha1);
    Build.findOne({'files.sha1': buildSha1}, (findError, build) => {
      if (build) {
        this.exec.sut.ref = build._id;
      }
      next();
    });
  }

  return next(error);
});
ResultSchema.virtual('exec.sut.sha1');
/* .get()
.set(function(v) {

}); */
ResultSchema.methods.setBuild = function setBuild() {

};
ResultSchema.methods.getBuild = function getBuild(next) {
  logger.debug('lookup build..');
  Build.findOne({_id: _.get(this, 'exec.sut.ref')}, next);
};
ResultSchema.methods.getLog = function getLog(index) {
  const file = _.get(this.exec, `logs.${index}`);
  if (!file) {
    return Promise.reject(new Error('Index invalid'));
  }
  return Promise.resolve(file);
};


/**
 * Statics
 */

ResultSchema.static({

});

/**
 * Register
 */
const Result = mongoose.model('Result', ResultSchema);
module.exports = {Model: Result, Collection: 'Result'};
