
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
  commit_id: {type: String, required: true }, //sha-1
  branch: { type: String },
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

BuildSchema.path('location').validate(function (value, respond) {
    if( value.length === 0 ) respond(false);
    else  respond(true);
 }, '{PATH} missing');


BuildSchema.pre('validate', true, function (next, done) {
  next();

  if( this.target ){
    if( this.target.simulator === false ) 
      done();
    else { 
      if( this.target.hw ) next();
      else done( 'target missing' );
    }
  } else {
    done( 'target missing' );
  }
 }, '{PATH}: invalid');

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
