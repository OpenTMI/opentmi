// Native modules
const path = require('path');

// Third party modules
const mime = require('mime');
const mongoose = require('mongoose');

// local module
const logger = require('../../tools/logger');
const nconf = require('../../../config');
const checksum = require('../../tools/checksum.js');

// Model variables
const fileProvider = nconf.get('filedb');


const FileSchema = new mongoose.Schema({
  // buffer limit 16MB when attached to document!
  name: {type: String},
  mime_type: {type: String},
  encoding: {type: String, enum: ['raw', 'base64'], default: 'raw'},
  data: {type: Buffer},
  size: {type: Number},
  sha1: {type: String, index: true, sparse: true},
  sha256: {type: String}
});
FileSchema.set('toObject', {virtuals: true});

/**
 * Virtual fields
 */
FileSchema.virtual('hrefs').get(function getHrefs() {
  const hasHref = fileProvider && (fileProvider !== 'mongodb') && this.sha1;
  return hasHref ? path.join(fileProvider, this.sha1) : undefined;
});

/**
 * Methods
 */
FileSchema.methods = {
  prepareForStorage() {
    logger.info(`[${this.name}] preparing file for storage.`);

    // Determine file mimetype from filename
    this.mime_type = this.name ? mime.lookup(this.name) : mime.default_type;
    logger.debug(`[${this.mime_type}] mime_type: ${this.mime_type}`);

    // Handle encoding
    logger.debug(`[${this.name}] used encoding: ${this.encoding}.`);
    switch (this.encoding) {
      case 'base64':
        this.data = new Buffer(this.data, 'base64');
        break;
      default:
        break;
    }

    // Calculate data size and checksums
    if (this.data) {
      this.size = this.data.length;
      this.sha1 = checksum(this.data, 'sha1');
      this.sha256 = checksum(this.data, 'sha256');
    }
  },
  checksum() {
    if (!this.sha1) {
      logger.warn('File without sha1 checksum processed, prepareForStorage not called?');

      if (this.data) {
        this.sha1 = checksum(this.data, 'sha1');
      } else {
        logger.warn('Could not calculate checksum for file without data.');
        return null;
      }
    }

    return this.sha1;
  }
};

mongoose.model('File', FileSchema);
module.exports = FileSchema;
