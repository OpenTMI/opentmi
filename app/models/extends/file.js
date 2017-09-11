// Native modules
const path = require('path');

// Third party modules
const logger = require('../../tools/logger');
const mongoose = require('mongoose');

// local module
const nconf = require('../../../config');
const checksum = require('../../tools/checksum.js');

// Model variables
const fileProvider = nconf.get('filedb');

const FileSchema = new mongoose.Schema({
  // buffer limit 16MB when attached to document!
  name: {type: String, default: 'no-name'},
  mime_type: {type: String},
  encoding: {type: String, enum: ['raw', 'base64'], default: 'raw'},
  data: {type: Buffer, default: new Buffer('', 'utf8')},
  size: {type: Number},
  sha1: {type: String, index: true, sparse: true},
  sha256: {type: String}
});
FileSchema.set('toObject', {virtuals: true});

FileSchema.virtual('hrefs').get(function getHrefs() {
  const hasHref = fileProvider && (fileProvider !== 'mongodb') && this.sha1;
  return hasHref ? path.join(fileProvider, this.sha1) : undefined;
});

FileSchema.methods.prepareDataForStorage = function prepareDataForStorage() {
  logger.info(`Preparing file (name: ${this.name}) for storage.`);

  if (this.base64) {
    logger.warn(`file[${i}] base64 field is deprecated! Please use encoding field to represent data encoding.`);
    this.data = this.base64;
    this.encoding = 'base64';
    this.base64 = undefined;
  }

  if (this.encoding === 'base64') {
    logger.debug('Base64 file detected, storing data to a buffer.');
    this.data = new Buffer(this.data, 'base64');
  }

  if (this.data) {
    this.size = this.data.length;
    // file.type = mimetype(file.name(
    this.sha1 = checksum(this.data, 'sha1');
    this.sha256 = checksum(this.data, 'sha256');
  }
};

FileSchema.methods.keepInMongo = function (i) { // eslint-disable-line
  logger.warn(`file[${i}] storing to mongodb`);
};

FileSchema.methods.storeInFiledb = function (filedb, i) { // eslint-disable-line
  // Store to filesystem
  filedb.storeFile(this)
    .then(() => {
      logger.silly(`file[${i}] ${this.name} stored`);
    })
    .catch((storeError) => {
      logger.warn(`file[${i}] failed to store: ${storeError.message}`);
      logger.debug(storeError.stack);
    });

  // Unallocate from mongo document
  this.data = undefined;
};

FileSchema.methods.dumpData = function (i) { // eslint-disable-line
  this.data = undefined;
  logger.warn(`file[${i}] cannot store, filedb is not configured`);
};

FileSchema.methods.checksum = function getChecksum() {
  if (!this.sha1) {
    logger.warn('File without sha1 checksum processed, prepareDataForStorage not called?');

    if (this.data) {
      this.sha1 = checksum(this.data, 'sha1');
    } else {
      logger.warn('Could not calculate checksum for file without data.');
      return null;
    }
  }

  return this.sha1;
};

mongoose.model('File', FileSchema);
module.exports = FileSchema;
