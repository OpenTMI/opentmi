
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
//var userPlugin = require('mongoose-user');
var Schema = mongoose.Schema;
var QueryPlugin = require('mongoose-query');

/**
 * User schema
 */
var ResultSchema = new Schema({
  tcid: { type: String, required: true },
  tcRef: {type: Schema.Types.ObjectId, ref: 'Testcase' },
  cre: {
    time: {type: Date, default: Date.now},
    user: {type: String},
    userRef: {type: Schema.Types.ObjectId, ref: 'User' } 
  },  
  exec: {
    verdict: { type: String, required: true, enum: ['pass', 'fail', 'inconclusive', 'blocked', 'error'] },
    duration: {type: Number}, //seconds
    framework: {
      name: {type: String, enum: ['clitest'], required: true},
      ver: {type: String, required: true},
    },
    env: {
      ref: {type: Schema.Types.ObjectId, ref: 'Resource' },
      rackId: {type: String},
    },
    dut: {
      ref: {type: Schema.Types.ObjectId, ref: 'Resource' },
      vendor: {type: String},
      model: {type: String},
      ver: {type: String},
      sn: {type: String},
      build: {
        ref: {type: Schema.Types.ObjectId, ref: 'Build' },
        branch: {type: String},
        commitId: {type: String},
        tag: [{type: String}],
        href: {type: String}
      },
    },
    logs: [
      {
        ref: {type: Schema.Types.ObjectId, ref: 'Resource' },
        from: {type: String, enum: ['dut', 'framework', 'env', 'other']},
        filename: {type: String},
        filesize: {type: Number},
        refs: {type: String},
        data: {type: Buffer},
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

ResultSchema.method({

});

/**
 * Statics
 */

ResultSchema.static({

});

/**
 * Register
 */
mongoose.model('Result', ResultSchema);
