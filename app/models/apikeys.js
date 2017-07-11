/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
var QueryPlugin = require('mongoose-query');
var bcrypt = require('bcryptjs');
var uuid = require('node-uuid');

/* Implementation */
var Schema = mongoose.Schema;
var Types = Schema.Types;
var ObjectId = Types.ObjectId;
var Mixed = Types.Mixed;
var Schema = mongoose.Schema;

/**
 * Group schema
 */

var ApiKeySchema = new Schema({
  name: { type: String },
  key: { type: String, default: uuid.v4, index: true },
  description: {type: String },
});

/**
 * Group plugin
 */
ApiKeySchema.plugin( QueryPlugin ); //install QueryPlugin

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */

 /**
 * Statics
 */

ApiKeySchema.static({
});

/**
 * Register
 */
let ApiKey = mongoose.model('ApiKey', ApiKeySchema);
module.exports = {Model: ApiKey, Collection: 'ApiKey'};
