
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
  tcRef: {type: String },
  cre: {
    time: {type: Date, default: Date.now},
    user: {type: String}
  },
  verdict: {
    final: {type: String, required: true, enum: ['pass', 'fail', 'inconclusive', 'blocked', 'error'] }
  },
  exec: {
    duration: {type: Number}, //seconds
    framework: {
      name: {type: String, enum: ['clitest'], required: true},
      ver: {type: String, required: true},
    },
    logs: [
      {
        filename: {type: String},
        filesize: {type: Number},
        refs: {type: String},
        data: {type: Buffer},
      }
    ]
  }
  //...
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
