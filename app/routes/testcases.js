var express = require('express');
const TestCaseController = require('./../controllers/testcases');

var Route = function(app, passport) {
  var router = express.Router();
  var controller = new TestCaseController();

  router.param('Testcase', controller.paramTestcase);
  router.param('format', controller.paramFormat);

  router.route('/api/v0/testcases.:format?')
    .all(controller.all.bind(controller))
    .get(controller.find.bind(controller))
    .post(controller.create.bind(controller));
  
  router.route('/api/v0/testcases/:testcase.:format?')
    .all(controller.all.bind(controller))
    .get(controller.get.bind(controller))
    .put(controller.update.bind(controller))
    .delete(controller.remove.bind(controller));

  router.route('/api/v0/testcases/:testcase/download')
    .all(controller.all.bind(controller))
    .get(controller.download.bind(controller));
  
  app.use(router);
}

module.exports = Route;