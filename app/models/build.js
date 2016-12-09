
/*!
 * Module dependencies
 */
// native modules
var crypto = require('crypto');

// 3rd party modules
var _ = require('underscore');
var uuid = require('node-uuid');
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
 * Location schema
 */
var Location = new Schema({
  url: {type: String }, // fs://... or http://... or ftp://... or sft://...
  auth: {
    usr: { type: String },
    pwd: { type: String }
  }
});

/**
 * Issue schema
 */
var Issue = new Schema({
  time: {type: Date, default: Date.now},
  type: { type: String, enum: ['github', 'jira'] },
  url: { type: String }
});

/**
 * Build schema
 */
var BuildSchema = new Schema({
  name: {type: String, required: true },
  type: { type: String, enum: ['app', 'lib'], default: 'app'},
  cre: {
    user: {type: String},
    time: {type: Date, default: Date.now}
  },
  mod: {
    user: {type: String},
    time: {type: Date, default: Date.now}
  },
  uuid: { type: String, default: uuid.v4, index: true },
  vcs: [
    new Schema({
      name: { type: String }, //e.g. "github"
      system: { type: String, enum: ['git','SVN', 'CSV'], default: 'git' },
      type: {type: String, enum: ['PR']},

      commitId: { type: String },
      branch: { type: String },

      base_branch: {type: String},
      base_commit: {type: String},
      pr_number: {type: String},
      url: { type: String },
      clean_wa: { type: Boolean }
    })
  ],
  ci: {
    system: {type: String, enum: ['Jenkins', 'travisCI', 'circleCI']},
    location: Location,
    job: {
      name: {type: String},
      number: {type: String}
    }
  },
  compiledBy: { type: String, enum: ['CI', 'manual'] },
  changeId: {type: String}, // e.g. when gerrit build
  meta_info: {
    compiler: {type: String},
    version: {type: String},
    toolchain: {type: String},
    machine: {type: String}
  },
  memory: {
    summary: {
      heap: {type: Number},
      static_ram: {type: Number},
      total_flash: {type: Number},
      stack: {type: Number},
      total_ram: {type: Number}
    }
  },
  files: [{
    //buffer limit 16MB when attached to document!
    name: { type: String },
    mime_type: { type: String },
    data: { type: Buffer },
    size: { type: Number },
    sha1: { type: String },
    sha256: { type: String }
  }],
  issues: [ Issue ],
  // build target device
  target: {
    type: { type: String, enum: ['simulate','hardware'], default: 'hardware', required: true},
    os: { type: String, enum: ['win32', 'win64', 'unix32', 'unix64', 'mbedOS', 'unknown'] },
    simulator: {
      bt: { type: String },
      network: { type: String }
    },
    hw: {
      vendor: { type: String },
      model: {type: String},
      rev: { type: String },
      meta: { type: String }
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

BuildSchema.pre('validate', function (next) {
  var err;
  if( _.isArray(this.files) ) {
    for(i=0;i<this.files.length;i++) {
        var file = this.files[i];
        if( !file.name) {
            err = new Error('file.name missing');
            break;
        }
        if(file.data) {
          file.size = file.data.length;
          //file.type = mimetype(file.name(
          file.sha1 = checksum(file.data, 'sha1');
          file.sha256 = checksum(file.data, 'sha256');
        }
    }
  }
  if( err ) {
      return next(err);
  }
  if( this.target.type === 'simulate' ){
    if( !this.target.simulator )
        err = new Error('simulator missing');
  } else if( this.target.type === 'hardware' ){ 
    if( !this.target.hw )
        err = new Error('target missing');
  }
  next(err);
 });

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
