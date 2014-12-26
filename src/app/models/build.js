
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
//var userPlugin = require('mongoose-user');
var Schema = mongoose.Schema;
var QueryPlugin = require('mongoose-query');
/**
 * Build schema
 */

var BuildSchema = new Schema({
  
  name: {type: String, required: true },
  v_ctrl: {type: String, enum: ['git','SVN', 'CSV']},
  repository: [
    new Schema({ 
      url: { type: String }
    })
  ],
  commit_id: {type: String, required: true }, //sha-1
  branch: { type: String },
  location: [
    new Schema({
      url: {type: String }, // fs://... or http://... or ftp://... or sft://...
      auth: {
        usr: { type: String },
        pwd: { type: String } 
      },
    })
  ],
  // build target device
  target: {
    simulator: { type: Boolean, default: false },
    hw: { type: String },
    rev: { type: String },
    rf: {
      // ??
    }
  }
});

/**
 * Build plugin
 */

//BuildSchema.plugin(userPlugin, {});

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */

BuildSchema.method({

});

/**
 * Statics
 */

BuildSchema.static({

});

/**
 * Register
 */
BuildSchema.plugin( QueryPlugin ); //install QueryPlugin
mongoose.model('Build', BuildSchema);
