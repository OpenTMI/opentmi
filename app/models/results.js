/*!
 * Module dependencies
 */

//3rd party modules
var mongoose = require('mongoose');
//var userPlugin = require('mongoose-user');
var QueryPlugin = require('mongoose-query');
var winston = require('winston');
var _ = require('lodash');

var Schema = mongoose.Schema;

var Build = mongoose.model('Build');

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
    dut: {  //device(s) under test
      count: {type: Number},
      type: {type: String, enum: ['hw','simulator', 'process'], default: 'hw'},
      ref: {type: Schema.Types.ObjectId, ref: 'Resource' },
      vendor: {type: String},
      model: {type: String},
      ver: {type: String},
      sn: {type: String}
    },
    logs: [
      {
        ref: {type: Schema.Types.ObjectId, ref: 'Resource' },
        from: {type: String, enum: ['dut', 'framework', 'env', 'other']},
        filename: {type: String},
        filesize: {type: Number},
        refs: {type: String},
        data: {type: Buffer}
      }
    ]
  }
});

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
