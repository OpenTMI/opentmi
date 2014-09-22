/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Testcase = mongoose.model('Testcase');

/**
 * List items tagged with a tag
 */

exports.index = function (req, res) {
  var criteria = { tags: req.param('tag') };
  var perPage = 5;
  var page = (req.param('page') > 0 ? req.param('page') : 1) - 1;
  var options = {
    perPage: perPage,
    page: page,
    criteria: criteria
  };

  Testcase.list(options, function(err, testcases) {
    if (err) return res.render('500');
    Testcase.count(criteria).exec(function (err, count) {
      res.render('testcases/index', {
        title: 'Testcases tagged ' + req.param('tag'),
        testcases: testcases,
        page: page + 1,
        pages: Math.ceil(count / perPage)
      });
    });
  });
};
