/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
require('colors');
const chai = require('chai');
const logger = require('winston');

// Local components
require('../../../app/models/build');
require('../../../app/models/results');
require('../../../app/models/testcase');
const TestcaseRoute = require('../../../app/routes/testcases');

// Setup
logger.level = 'error';

// Test variables
const expect = chai.expect;

describe('routes/testcases.js', function () {
  describe('Route', function () {
    // Check that router creates a handler for url parameter Testcase
    it('Route - handler for Testcase param gets defined', function (done) {
      const app = {use: (router) => {
        expect(router).to.have.property('params').with.property('Testcase');

        done();
      }};

      TestcaseRoute(app);
    });

    // Check that all routes are defined and implement the right methods
    it('Route - should define correct routes', function (done) {
      const app = {use: (router) => {
        expect(router).to.have.property('stack').with.lengthOf(4);

        expect(router.stack[0].route).to.have.property('path', '/api/v0/testcases.:format?');
        expect(router.stack[0].route).to.have.deep.property(
          'methods',
          {_all: true, get: true, post: true, put: true},
          'expecting all route to define all methods'
        );

        expect(router.stack[1].route).to.have.property('path', '/api/v0/testcases/result.:format?');
        expect(router.stack[1].route).to.have.deep.property(
          'methods',
          {_all: true, post: true},
          'expecting result route to define all and post methods'
        );

        expect(router.stack[2].route).to.have.property('path', '/api/v0/testcases/:testcase.:format?');
        expect(router.stack[2].route).to.have.deep.property(
          'methods',
          {_all: true, get: true, put: true, delete: true},
          'expecting testcase route to define all, get and put methods'
        );

        expect(router.stack[3].route).to.have.property('path', '/api/v0/testcases/:testcase/download');
        expect(router.stack[3].route).to.have.deep.property(
          'methods',
          {_all: true, get: true},
          'expecting testcase download to define all and get methods'
        );

        done();
      }};

      TestcaseRoute(app);
    });
  });
});
