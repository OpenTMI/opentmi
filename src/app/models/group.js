
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

var GroupSchema = new Schema({
  name: { type: String, required: true },
  users: [ { type: String } ]
});

/**
 * User plugin
 */
GroupSchema.plugin( QueryPlugin ); //install QueryPlugin

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */

GroupSchema.method({

});

/**
 * Statics
 */

GroupSchema.static({

});

/**
 * Register
 */
mongoose.model('Group', GroupSchema);
