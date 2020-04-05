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
const {Schema} = mongoose;
const {Types} = Schema;
const {ObjectId, Mixed} = Types;
const {filedb} = tools;
const fileProvider = filedb.provider;

// @Todo justify why file schema is extended here instead of adding to root model
FileSchema.add({
  ref: {type: ObjectId, ref: 'Resource'},
  from: {type: String, enum: ['dut', 'framework', 'env', 'other']}
});

// Device(s) Under Test
const DutSchema = new Schema({
  type: {type: String, enum: ['hw', 'simulator', 'process']},
  ref: {type: ObjectId, ref: 'Resource'},
  platform: {type: String},
  vendor: {type: String},
  model: {type: String},
  ver: {type: String},
  sn: {type: String},
  provider: {
    name: {type: String},
    id: {type: String},
    ver: {type: String}
  }
});
/**
 * User schema
 */
const ResultSchema = new Schema({
  tcid: {type: String, required: true, index: true},
  tcRef: {type: ObjectId, ref: 'Testcase'},
  job: {
    id: {type: String, default: ''}
  },
  campaign: {type: String, default: '', index: true},
  campaignRef: {type: ObjectId, ref: 'Campaign'},
  cre: {
    time: {type: Date, default: Date.now, index: true},
    user: {type: String},
    userRef: {type: ObjectId, ref: 'User'}
  },
  exec: {
    verdict: {
      type: String,
      required: true,
      enum: ['pass', 'fail', 'inconclusive', 'blocked', 'error', 'skip'],
      index: true
    },
    note: {type: String, default: ''},
    duration: {type: Number}, // seconds
    profiling: {type: Mixed},
    metadata: {type: Mixed},
    metrics: {type: Mixed},
    env: { // environment information
      ref: {type: ObjectId, ref: 'Resource'},
      rackId: {type: String},
      framework: {
        name: {type: String, default: ''},
        ver: {type: String, default: ''}
      }
    },
    sut: { // software under test
      ref: {type: ObjectId, ref: 'Build'},
      gitUrl: {type: String},
      buildName: {type: String},
      buildDate: {type: Date},
      buildUrl: {type: String},
      buildSha1: {type: String},
      branch: {type: String},
      commitId: {type: String},
      tag: [{type: String}],
      href: {type: String},
      cut: [{type: String}], // Component Under Test
      fut: [{type: String}] // Feature Under Test
    },
    duts: [DutSchema],
    logs: [FileSchema]
  }
}, {
  toJSON: {virtuals: true, getters: true},
  toObject: {virtuals: true, getters: true}
});

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
ResultSchema.methods.getBuildRef = function () { // eslint-disable-line func-names
  logger.debug('lookup build..');
  return _.get(this, 'exec.sut.ref', undefined);
};

/**
 * Mappers
 */
async function linkRelatedBuild(result) {
  const buildChecksum = _.get(result, 'exec.sut.buildSha1');
  if (!buildChecksum) {
    return;
  }
  if (_.get(result, 'exec.sut.ref')) {
    // already given
    return;
  }
  logger.debug(`Processing result build sha1: ${buildChecksum}`);
  const build = await mongoose.model('Build').findOne({'files.sha1': buildChecksum});
  if (build) {
    logger.debug(`Build found, linking Result: ${result._id} with Build: ${build._id}`);
    result.exec.sut.ref = build._id; // eslint-disable-line no-param-reassign
  }
}
async function linkTestcase(result) {
  const {tcid} = result;
  if (!tcid) {
    throw new Error('tcid is missing!');
  }
  if (result.tcRef) {
    return;
  }
  logger.debug(`Processing result tcid: ${tcid}`);
  const test = await mongoose.model('Testcase').findOne({tcid});
  if (test) {
    logger.debug(`Test found, linking Result: ${result._id} with Test: ${test._id}`);
    result.tcRef = test._id; // eslint-disable-line no-param-reassign
  }
}


async function storeFile(file, i) {
  file.prepareDataForStorage(i);

  // Decide what to do with file
  if (fileProvider === 'mongodb') {
    file.keepInMongo(i);
    return Promise.resolve();
  } else if (fileProvider) {
    return file.storeInFiledb(filedb, i);
  }
  file.dumpData(i);
  return Promise.resolve();
}

async function preSave(next) {
  try {
    // Link related objects
    await linkTestcase(this, _.get(this, ''));
    await linkRelatedBuild(this);
    const logs = _.get(this, 'exec.logs', []);
    await Promise.all(logs.map(storeFile));
    next();
  } catch (error) {
    next(error);
  }
}

ResultSchema.pre('save', preSave);

/**
 * Virtuals
 */
ResultSchema
  .virtual('exec.dut')
  .get(function dutGet() {
    return _.get(this, 'exec.duts.0', {});
  })
  .set(function dutSet(obj) {
    if (!this.exec.duts) {
      this.exec.duts = [];
    }
    this.exec.duts.push(obj);
  });

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
