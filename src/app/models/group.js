
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
//var userPlugin = require('mongoose-user');
var Schema = mongoose.Schema;
var QueryPlugin = require('mongoose-query');
/**
 * Group schema
 */

var GroupSchema = new Schema({
  name: { type: String, required: true },
  users: [ { type: String } ]
});

/**
 * Group plugin
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
