/*!
 * Module dependencies
 */
// Native modules
const path = require('path');

// Third party modules
const _ = require('lodash');
const uuidv4 = require('uuid').v4;
const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');

// Local modules
const logger = require('../tools/logger');
const FileSchema = require('./extends/file');
const tools = require('../tools');

const {filedb} = tools;
const fileProvider = filedb.provider;
const {Schema} = mongoose;

/**
 * Location schema
 */
const Location = new Schema({
  url: {type: String}, // fs://... or http://... or ftp://... or sft://...
  auth: {
    usr: {type: String},
    pwd: {type: String}
  }
});

/**
 * Issue schema
 */
const Issue = new Schema({
  time: {type: Date, default: Date.now},
  type: {type: String, enum: ['github', 'jira']},
  url: {type: String}
});

/**
 * Build schema
 */
const BuildSchema = new Schema({
  name: {type: String, required: true},
  type: {type: String, enum: ['app', 'lib', 'test'], default: 'app'},
  cre: {
    user: {type: String},
    time: {type: Date, default: Date.now},
    host: {type: String}
  },
  mod: {
    user: {type: String},
    time: {type: Date, default: Date.now}
  },
  uuid: {type: String, default: uuidv4, index: true},
  vcs: [
    new Schema({
      name: {type: String}, // e.g. "github"
      system: {type: String, enum: ['git', 'SVN', 'CSV'], default: 'git'},
      type: {type: String, enum: ['PR']},
      commitId: {type: String},
      branch: {type: String},
      base_branch: {type: String},
      base_commit: {type: String},
      pr_number: {type: String},
      url: {type: String},
      clean_wa: {type: Boolean}
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
  compiledBy: {type: String, enum: ['CI', 'manual']},
  changeId: {type: String}, // e.g. when gerrit build
  configuration: {
    name: {type: String},
    compiler: {
      name: {type: String},
      version: {type: String},
      macros: [{
        key: {type: String},
        value: {type: String}
      }],
      flags: [{
        key: {type: String},
        value: {type: String}
      }]
    },
    linker: {
      name: {type: String},
      version: {type: String},
      flags: [{
        key: {type: String},
        value: {type: String}
      }]
    },
    toolchain: {
      name: {type: String},
      version: {type: String}
    }
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
  files: [FileSchema],
  issues: [Issue],
  // build target device
  target: {
    type: {type: String, enum: ['simulate', 'hardware'], default: 'hardware', required: true},
    os: {type: String, enum: ['win32', 'win64', 'unix32', 'unix64', 'mbedOS', 'unknown']},
    simulator: {
      bt: {type: String},
      network: {type: String}
    },
    hw: {
      vendor: {type: String},
      model: {type: String},
      rev: {type: String},
      meta: {type: String}
    }
  }
});
BuildSchema.set('toObject', {virtuals: true});
// BuildSchema.set('toJSON', { virtuals: true });


/**
 * Build plugin
 */
BuildSchema.plugin(QueryPlugin); // install QueryPlugin

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


BuildSchema.pre('validate', function validate(next) {
  // Files property should be an array
  if (!Array.isArray(this.files)) {
    const error = new Error('Expected files property to be an array');
    return next(error);
  }

  // Prepare all files for storage
  this.files.forEach((file, i) => {
    // Prepare for storage
    file.prepareDataForStorage(i);

    // Save document according to fileProvider
    if (fileProvider === 'mongodb') { // MongoDB
      return logger.warn(`[${file.name}] keeping file data in mongodb`);
    }

    if (fileProvider) { // Local filesystem
      logger.debug(`[${file.name}] moving file data to filesystem...`);
      filedb.storeFile(file)
        .then(() => {
          logger.verbose(`[${file.name}] file stored to filedb`);
        })
        .catch((_error) => {
          const error = _error;
          error.message = `Failed to store file data: ${error.message}`;
          logger.warn(error.message);
        });
    } else { // dev/null
      logger.warn('Filedb is not configured, ignoring data');
    }

    // stored data seperately, unassign data from schema
    file.data = undefined; // eslint-disable-line no-param-reassign
    return undefined;
  });

  return next();
});

// Ensure target is properly defined
BuildSchema.pre('validate', function validate(next) {
  let error;

  // If target type is simulate, target must define simulator property
  if (_.get(this, 'target.type') === 'simulate') {
    if (!_.get(this, 'target.simulator')) {
      error = new Error('simulator missing');
    }
  }

  // If target type is hardware, target must define both hw and hw.model
  if (_.get(this, 'target.type') === 'hardware') {
    if (!_.get(this, 'target.hw')) {
      error = new Error('target.hw missing');
    } else if (!_.get(this, 'target.hw.model')) {
      error = new Error('target.hw.model missing');
    }
  }

  return next(error);
});

/**
 * Virtual fields
 */
BuildSchema.virtual('file').get(function getFirstFile() {
  if (this.files.length === 1) {
    if (fileProvider && fileProvider !== 'mongodb' && this.files[0].sha1) {
      return path.join(fileProvider, this.files[0].sha1);
    }
  }

  return undefined;
});

/**
 * Methods
 */
BuildSchema.methods.getFile = function getFile(index = 0) {
  if (index >= this.files.length) {
    const error = new Error(`Index does not point to a file, index: ${index}`);
    error.status = 400;
    return Promise.reject(error);
  }

  // Get file subdocument from document
  const file = this.files[index];

  // If data stored in mongoose document, use that
  if (file.data) {
    return Promise.resolve(file);
  }

  // Read data from filedb
  return filedb.readFile(file);
};

/**
 * Statics
 */
// BuildSchema.static({});

/**
 * Register
 */
const Build = mongoose.model('Build', BuildSchema);
module.exports = {Model: Build, Collection: 'Build'};
