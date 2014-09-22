
/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Notifier = require('notifier');
var config = require('config');

/**
 * Process the templates using swig - refer to notifier#processTemplate method
 *
 * @param {String} tplPath
 * @param {Object} locals
 * @return {String}
 * @api public
 */

Notifier.prototype.processTemplate = function (tplPath, locals) {
  var swig = require('swig');
  locals.filename = tplPath;
  return swig.renderFile(tplPath, locals);
};

/**
 * Expose
 */

module.exports = {

  /**
   * Comment notification
   *
   * @param {Object} options
   * @param {Function} cb
   * @api public
   */

  comment: function (options, cb) {
    var testcases = options.testcases;
    var author = testcases.user;
    var user = options.currentUser;
    var notifier = new Notifier(config.notifier);

    var obj = {
      to: author.email,
      from: 'your@product.com',
      subject: user.name + ' added a comment on your testcases ' + testcases.title,
      alert: user.name + ' says: "' + options.comment,
      locals: {
        to: author.name,
        from: user.name,
        body: options.comment,
        testcases: testcases.name
      }
    };

    // for apple push notifications
    /*notifier.use({
      APN: true
      parseChannels: ['USER_' + author._id.toString()]
    })*/

    try {
      notifier.send('comment', obj, cb);
    } catch (err) {
      console.log(err);
    }
  }
};
