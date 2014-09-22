
/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
var Testcase = mongoose.model('Testcase')
var utils = require('../../lib/utils')
var extend = require('util')._extend

/**
 * Load
 */

exports.load = function (req, res, next, id){
  var User = mongoose.model('User');

  Testcase.load(id, function (err, testcase) {
    if (err) return next(err);
    if (!testcase) return next(new Error('not found'));
    req.testcase = testcase;
    next();
  });
};

/**
 * List
 */

exports.index = function (req, res){
  var page = (req.param('page') > 0 ? req.param('page') : 1) - 1;
  var perPage = 30;
  var options = {
    perPage: perPage,
    page: page
  };

  Testcase.list(options, function (err, testcases) {
    if (err) return res.render('500');
    Testcase.count().exec(function (err, count) {
      console.log(testcases);
      res.render('testcases/index', {
        title: 'Testcases',
        testcases: testcases,
        page: page + 1,
        pages: Math.ceil(count / perPage)
      });
    });
  });
};

/**
 * New testcase
 */

exports.new = function (req, res){
  res.render('testcases/new', {
    title: 'New Testcase',
    testcase: new Testcase({})
  });
};

/**
 * Create an testcase
 * Upload an image
 */

exports.create = function (req, res) {
  var testcase = new Testcase(req.body);
  var images = req.files.image
    ? [req.files.image]
    : undefined;

  testcase.user = req.user;
  testcase.uploadAndSave(images, function (err) {
    if (!err) {
      req.flash('success', 'Successfully created testcase!');
      return res.redirect('/testcases/'+testcase._id);
    }
    console.log(err);
    res.render('testcases/new', {
      title: 'New Testcase',
      testcase: testcase,
      errors: utils.errors(err.errors || err)
    });
  });
};

/**
 * Edit an testcase
 */

exports.edit = function (req, res) {
  res.render('testcases/edit', {
    title: 'Edit ' + req.testcase.title,
    testcase: req.testcase
  });
};

/**
 * Update testcase
 */

exports.update = function (req, res){
  var testcase = req.testcase;
  var images = req.files.image
    ? [req.files.image]
    : undefined;

  // make sure no one changes the user
  delete req.body.user;
  testcase = extend(testcase, req.body);

  testcase.uploadAndSave(images, function (err) {
    if (!err) {
      return res.redirect('/testcases/' + testcase._id);
    }

    res.render('testcases/edit', {
      title: 'Edit testcase',
      testcase: testcase,
      errors: utils.errors(err.errors || err)
    });
  });
};

/**
 * Show
 */

exports.show = function (req, res){
  res.render('testcases/show', {
    title: req.testcase.title,
    testcase: req.testcase
  });
};

/**
 * Delete an testcase
 */

exports.destroy = function (req, res){
  var testcase = req.testcase;
  testcase.remove(function (err){
    req.flash('info', 'Deleted successfully');
    res.redirect('/testcases');
  });
};
