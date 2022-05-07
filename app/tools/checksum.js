/*!
 * Module dependencies
 */
// native modules
const crypto = require('crypto');

module.exports = function checksum(str, algorithm, encoding) {
  return crypto
    .createHash(algorithm || 'sha1')
    .update(str, 'binary')
    .digest(encoding || 'hex');
};
