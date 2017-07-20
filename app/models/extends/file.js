// native modules
const path = require('path');

// 3rd party modules
const logger = require('winston');
const mongoose = require('mongoose');

// local module
const nconf = require('../../../config');
const checksum = require('../../tools/checksum.js');
const fileProvider = nconf.get('filedb');

const FileSchema = new mongoose.Schema({
  // buffer limit 16MB when attached to document!
  name: { type: String },
  mime_type: { type: String },
  encoding: { type: String, enum: ['raw', 'base64'], default: 'raw' },
  data: { type: Buffer },
  size: { type: Number },
  sha1: { type: String, index: true, sparse: true },
  sha256: { type: String }
});
FileSchema.set('toObject', { virtuals: true });

FileSchema.virtual('hrefs').get(function () {
  const hasHref = fileProvider && (fileProvider !== 'mongodb') && this.sha1;
  const pathToFile = path.join(fileProvider, this.sha1);
  return hasHref ? pathToFile : undefined;
});

FileSchema.methods.prepareDataForStorage = function () {
  logger.info(`Preparing file (name: ${this.name}) for storage.`);

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

FileSchema.methods.storeInFileDB = function () {
  // filedb is reuired here because it causes a circular dependency otherwise
  const filedb = require('../tools/filedb.js'); // eslint-disable-line
  return filedb.storeFile(this).catch((error) => {
    logger.error(`Could not save file to filedb, reason: ${error.message}.`);
    throw error;
  });
};

FileSchema.methods.retrieveFromFileDB = function () {
  // filedb is reuired here because it causes a circular dependency otherwise
  const filedb = require('../tools/filedb.js'); // eslint-disable-line
  return filedb.readFile(this).then((data) => {
    this.data = data;
    return data;
  }).catch((error) => {
    logger.error(`Could not read file from filedb, reason: ${error.message}.`);
    throw error;
  });
};

FileSchema.methods.checksum = function () {
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
