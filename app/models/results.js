/*!
 * Module dependencies
 */

//3rd party modules
const mongoose = require('mongoose');
//var userPlugin = require('mongoose-user');
const QueryPlugin = require('mongoose-query');
const winston = require('winston');
const _ = require('lodash');
const Schema = mongoose.Schema;


const FileSchema = require('./file');
const tools = require('../tools');
const checksum = tools.checksum;
const filedb = tools.filedb;
const file_provider = filedb.provider;

const Build = mongoose.model('Build');

FileSchema.add({
    ref: {type: Schema.Types.ObjectId, ref: 'Resource' },
    from: {type: String, enum: ['dut', 'framework', 'env', 'other']}
});

/**
 * User schema
 */
var ResultSchema = new Schema({
  tcid: { type: String, required: true },
  tcRef: {type: Schema.Types.ObjectId, ref: 'Testcase' },
  job:{
    id: { type: String, default: ''}
  },
  campaign: {type: String, default: '', index: true},
  campaignRef: {type: Schema.Types.ObjectId, ref: 'Campaign' },
  cre: {
    time: {type: Date, default: Date.now, index: true},
    user: {type: String},
    userRef: {type: Schema.Types.ObjectId, ref: 'User' } 
  },  
  exec: {
    verdict: { type: String, required: true, enum: ['pass', 'fail', 'inconclusive', 'blocked', 'error'] },
    note: {type: String, default: ''},
    duration: {type: Number}, //seconds
    profiling: {type: Schema.Types.Mixed},
    env: { //environment information
      ref: {type: Schema.Types.ObjectId, ref: 'Resource' },
      rackId: {type: String},
      framework: {
        name: {type: String, default: ''},
        ver: {type: String, default: ''}
      }
    },
    sut: { // software under test
      ref: {type: Schema.Types.ObjectId, ref: 'Build' },
      gitUrl: {type: String, default: ''},
      buildName: {type: String},
      buildDate: {type: Date},
      buildUrl: {type: String, default: ''},
      buildSha1: {type: String },
      branch: {type: String, default: ''},
      commitId: {type: String, default: ''},
      tag: [{type: String}],
      href: {type: String},
      cut: [{type: String}], // Component Under Test
      fut: [{type: String}] // Feature Under Test
    },
    dut: {  // Device(s) Under Test
      count: {type: Number},
      type: {type: String, enum: ['hw','simulator', 'process']},
      ref: {type: Schema.Types.ObjectId, ref: 'Resource' },
      vendor: {type: String},
      model: {type: String},
      ver: {type: String},
      sn: {type: String}
    },
    logs: [ FileSchema ]
  }
});

ResultSchema.set('toObject', {virtuals: true});

/**
 * Query plugin
 */
ResultSchema.plugin( QueryPlugin ); //install QueryPlugin

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */
ResultSchema.pre('validate', function (next) {
  var err;
  var buildSha1 = _.get(this, 'exec.sut.buildSha1');

  var logs = _.get(this, 'exec.logs');
  if (_.isArray(logs)) {
    for (const i = 0; i < logs.length; i++) {
      var file = logs[i];
      if (!file.name) {
        err = new Error('file[' + i + '].name missing');
        break;
      }
      if (file.base64) {
        file.data = new Buffer(file.base64, 'base64');
        file.base64 = undefined;
      }
      if (file.data) {
        file.size = file.data.length;
        //file.type = mimetype(file.name(
        file.sha1 = checksum(file.data, 'sha1');
        file.sha256 = checksum(file.data, 'sha256');
        if (file_provider === 'mongodb') {
          //use mongodb document
          winston.warn('store file %s to mongodb', file.name);
        } else if (file_provider) {
          // store to filesystem
          filedb.storeFile(file);
          file.data = undefined;
        } else {
          //do not store at all..
          file.data = undefined;
          winston.warn('filedb is not configured');
        }
      }
    }
  }
  if (err) {
    return next(err);
  }

  if (buildSha1) {
    winston.debug('result build sha1: ', buildSha1);
    Build.findOne({'files.sha1': buildSha1}, (err, build) => {
      if(build) {
        this.exec.sut.ref = build._id;
      }
      next();
    });
    return;
  }

  next(err);
});
ResultSchema.virtual('exec.sut.sha1');
  /*.get()
  .set(function(v) {

  });*/
ResultSchema.methods.setBuild = function(cb) {

};
ResultSchema.methods.getBuild = function(cb) {
  winston.debug('lookup build..');
  Build.findOne({_id: _.get(this, 'exec.sut.ref')}, cb);
};

/**
 * Statics
 */

ResultSchema.static({

});

/**
 * Register
 */
mongoose.model('Result', ResultSchema);
