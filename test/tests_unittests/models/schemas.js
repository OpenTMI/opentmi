/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('chai');
const logger = require('winston');

// Local components
const SchemaRoute = require('../../../app/routes/schemas');

// Setup
logger.level = 'error';

// Test variables
const expect = chai.expect;

describe.only('routes/schemas.js', function () {
  describe('Route', function () {
    it('should define a parameter handler for Collection parameter', function (done) {
      const app = {
        use: (router) => {
          expect(router).to.have.property('params');
          expect(router.params).to.have.property('Collection');
          done();
        }
      };

      SchemaRoute(app);
    });

    it('should define correct routes', function (done) {
      const app = {
        use: (router) => {
          expect(router).to.have.property('stack');
          expect(router.stack).to.have.lengthOf(2);
          expect(router.stack[0]).to.have.property('route');
          expect(router.stack[1]).to.have.property('route');
          expect(router.stack[0].route).to.have.property('path', '/api/v0/schemas.:format?');
          expect(router.stack[1].route).to.have.property('path', '/api/v0/schemas/:Collection.:format?');
          done();
        }
      };

      SchemaRoute(app);
    });
  });
});
