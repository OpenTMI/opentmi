
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
var QueryPlugin = require('mongoose-query');


var Schema = mongoose.Schema;
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
  commitId: {type: String }, //sha-1
  branch: { type: String },
  compiledBy: {type: String, enum: ['CI', 'manual']},
  changeId: {type: String}, // e.g. when gerrit build
  pullRequest: {type: String}, // e.g. when github
  meta_info: {
    compiler: {type: String},
    version: {type: String},
    machine: {type: String},
  },
  file: {
    //buffer limit 16MB when attached to document!
    name: { type: String },
    data: { type: Buffer },
    size: { type: Number }
  },
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
    type: { type: String, enum: ['simulate','hardware'], required: true},
    os: { type: String, enum: ['win32', 'win64', 'linux32', 'linux64', 'mbedOS', 'unknown'] },
    simulator: {
      bt: {type: String},
      network: {type: String},
    },
    hw: {
      vendor: { type: String },
      platform: {type: String},
      rev: { type: String },
      rf: {
        // ??
      }
    }
  }
});

/**
 * Build plugin
 */
BuildSchema.plugin( QueryPlugin ); //install QueryPlugin

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/*
BuildSchema.path('location').validate(function (value, respond) {
    if( value.length === 0 ) respond(false);
    else  respond(true);
 }, '{PATH} missing');

BuildSchema.pre('validate', true, function (next, done) {

  if( this.target.type === 'simulate' ){ 
      next();
  } else if( this.target.type === 'hardware' ){ 
    if( this.target.hw ) next();
    else next( 'target missing' );
  } else {
    next( 'target missing' );
  }
 }, '{PATH}: invalid');
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
mongoose.model('Build', BuildSchema);
