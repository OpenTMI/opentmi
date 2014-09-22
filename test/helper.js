
/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , async = require('async')
  , Testcase = mongoose.model('Testcase')
  , User = mongoose.model('User')

/**
 * Clear database
 *
 * @param {Function} done
 * @api public
 */

exports.clearDb = function (done) {
  async.parallel([
    function (cb) {
      User.collection.remove(cb)
    },
    function (cb) {
      Testcase.collection.remove(cb)
    }
  ], done)
}
