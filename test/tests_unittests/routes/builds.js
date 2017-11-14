/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('chai');
const logger = require('winston');

// Local components
require('../../../app/models/build.js');
const SchemaRoute = require('../../../app/routes/builds');

// Setup
logger.level = 'error';

// Test variables
const expect = chai.expect;

describe('routes/builds.js', function () {
  describe('Route', function () {
    it('should define a parameter handler for Build parameter', function (done) {
      const app = {
        use: (router) => {
          expect(router).to.have.property('params');
          expect(router.params).to.have.property('Build');
          done();
        }
      };

      SchemaRoute(app);
    });

    it('should define correct routes', function (done) {
      const app = {
        use: (router) => {
          expect(router).to.have.property('stack');
          expect(router.stack).to.have.lengthOf(3);

          expect(router.stack[0]).to.have.property('route');
          expect(router.stack[0].route).to.have.property('path', '/api/v0/duts/builds.:format?');
          expect(router.stack[0].route).to.have.deep.property('methods', {_all: true, get: true, post: true});

          expect(router.stack[1]).to.have.property('route');
          expect(router.stack[1].route).to.have.property('path', '/api/v0/duts/builds/:Build.:format?');
          expect(router.stack[1].route).to.have.deep.property('methods',
            {_all: true, delete: true, get: true, put: true});

          expect(router.stack[2]).to.have.property('route');
          expect(router.stack[2].route).to.have.property('path', '/api/v0/duts/builds/:Build/files/:Index/download');
          expect(router.stack[2].route).to.have.deep.property('methods', {get: true});

          done();
        }
      };

      SchemaRoute(app);
    });
  });
});
