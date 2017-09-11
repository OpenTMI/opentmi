/*!
 * Module dependencies
 */

// Third party modules
const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');
const logger = require('../tools/logger');
const _ = require('lodash');

// Local components
const FileSchema = require('./extends/file');
const tools = require('../tools');

// Model variables
const Schema = mongoose.Schema;
const filedb = tools.filedb;
const fileProvider = filedb.provider;
const Build = mongoose.model('Build');

// @Todo justify why file schema is extended here instead of adding to root model
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
ResultSchema.methods.getBuildId = function () { // eslint-disable-line func-names
  logger.debug('lookup build..');
  return _.get(this, 'exec.sut.ref', undefined);
};

/**
 * Validation
 */
function linkRelatedBuild(buildChecksum, next) {
  logger.debug(`Processing result build sha1: ${buildChecksum}`);
  Build.findOne({'files.sha1': buildChecksum}, (findError, build) => {
    if (build) {
      logger.debug(`Build found, linking Result: ${this._id} with Build: ${build._id}`);
      this.exec.sut.ref = build._id;
    }
    next();
  });
}

ResultSchema.pre('validate', function (next) { // eslint-disable-line func-names
  // Validate logs field
  // @Todo Maybe this check is unnecessary
  // can exec.logs be something else from an array since it is defined by the schema?
  const logs = _.get(this, 'exec.logs');
  if (!Array.isArray(logs)) {
    const error = new Error(`Result corrupted, logs field does not contain an array, found: ${logs}`);
    return next(error);
  }

  // Iterate over all logs
  logs.forEach((file, i) => {
    file.prepareDataForStorage();

    // Decide what to do with file
    if (fileProvider === 'mongodb') {
      file.keepInMongo(i);
    } else if (fileProvider) {
      file.storeInFiledb(filedb, i);
    } else {
      file.dumpData(i);
    }
  });

  // Link related build to this result
  const buildChecksum = _.get(this, 'exec.sut.buildSha1');
  if (buildChecksum) {
    linkRelatedBuild(buildChecksum, next);
  } else {
    next();
  }

  return undefined;
});

/**
 * Virtuals
 */
/*
ResultSchema.virtual('exec.sut.sha1');
  .get()
  .set(function(v) {
});
*/

/**
 * Statics
 */
/* 
ResultSchema.static({

});
*/

/**
 * Register
 */
const Result = mongoose.model('Result', ResultSchema);
module.exports = {Model: Result, Collection: 'Result'};
