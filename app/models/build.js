
/*!
 * Module dependencies
 */
// native modules
var crypto = require('crypto');

// 3rd party modules
var mongoose = require('mongoose');
var QueryPlugin = require('mongoose-query');


function checksum (str, algorithm, encoding) {
    return crypto
        .createHash(algorithm || 'sha1')
        .update(str, 'binary')
        .digest(encoding || 'hex')
}

var Schema = mongoose.Schema;

/**
 * Build schema
 */
var BuildSchema = new Schema({
  name: {type: String, required: true },
  type: { type: String, enum: ['cliapp', 'unittest']},
  cre: {
    user: {type: String},
    time: {type: Date, default: Date.now},
  },
  mod: {
    user: {type: String},
    time: {type: Date, default: Date.now},
  },
  uuid: { type: String },
  repository: [
    new Schema({ 
      vcs: { type: String, enum: ['git','SVN', 'CSV'] }, //version control system
      url: { type: String },
      commitId: { type: String },
      clean_wa: { type: Boolean }, 
      branch: { type: String },
    })
  ],
  compiledBy: { type: String, enum: ['CI', 'manual'] },
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
    size: { type: Number },
    sha1: { type: String },
    sha256: { type: String }
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
  issues: [
    new Schema({
      time: {type: Date, default: Date.now},
      type: { type: String, enum: ['github', 'jira'] },
      url: { type: String }
    })
  ],
  // build target device
  target: {
    type: { type: String, enum: ['simulate','hardware'], default: 'hardware'},
    os: { type: String, enum: ['win32', 'win64', 'linux32', 'linux64', 'mbedOS', 'unknown'] },
    simulator: {
      bt: { type: String },
      network: { type: String },
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
 */

BuildSchema.pre('validate', true, function (next, done) {

  if( this.build.data ) {
    this.build.size = this.build.data.length;
    this.build.sha1 = checksum(this.build.data, 'sha1');
    this.build.sha256 = checksum(this.build.data, 'sha256');
  }
  if( this.target.type === 'simulate' ){
    if( this.target.simulator ) next():
    else next('simulator missing');
  } else if( this.target.type === 'hardware' ){ 
    if( this.target.hw ) next();
    else next( 'target missing' );
  } else {
    next( 'target missing' );
  }
 }, '{PATH}: invalid');

/**
 * Methods
 */
//BuildSchema.method({});

/**
 * Statics
 */
//BuildSchema.static({});

/**
 * Register
 */
mongoose.model('Build', BuildSchema);
