/*!
 * Module dependencies
 */
const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');
const uuid = require('node-uuid');

/* Implementation */
const Schema = mongoose.Schema;

/**
 * Group schema
 */
const ApiKeySchema = new Schema({
  name: {type: String},
  key: {type: String, default: uuid.v4, index: true},
  description: {type: String}
});

/**
 * Group plugin
 */
ApiKeySchema.plugin(QueryPlugin); // install QueryPlugin

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
const ApiKey = mongoose.model('ApiKey', ApiKeySchema);
module.exports = {Model: ApiKey, Collection: 'ApiKey'};
