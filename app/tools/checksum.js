
/*!
 * Module dependencies
 */
// native modules
var crypto = require('crypto');

module.exports = function checksum (str, algorithm, encoding) {
    return crypto
        .createHash(algorithm || 'sha1')
        .update(str, 'binary')
        .digest(encoding || 'hex')
}
