
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * User schema
 */

var TestCaseSchema = new Schema({
  name: { type: String, default: '' }
});


/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */

TestCaseSchema.method({

});

/**
 * Statics
 */

TestCaseSchema.static({

});

/**
 * Register
 */

mongoose.model('Testcase', TestCaseSchema);
