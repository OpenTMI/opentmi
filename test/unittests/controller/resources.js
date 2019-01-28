/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('chai');
const sinon = require('sinon');
const Promise = require('bluebird');

// Local components
const {setup, reset, teardown} = require('../../utils/mongomock');
require('./../../../app/models/resource.js');
const ResourceController = require('./../../../app/controllers/resources.js');
const MockResponse = require('./mocking/MockResponse.js');
const {newResponse, newRequest} = require('../helpers');


// Test variables
const {expect} = chai;

describe('controllers/resources.js', function () {
  let controller;

  // Create fresh DB
  before(setup);
  before(function () {
    controller = new ResourceController(); // eslint-disable-line no-unused-vars
  });
  beforeEach(reset);
  after(teardown);

  it('custom modelParam', function () {
    const next = sinon.stub();
    const req = newRequest({}, {Resource: '123'});
    const res = newResponse();
    const resource = {a: 1};
    sinon.stub(controller._model, 'findOne').resolves(resource);
    return controller.modelParam(req, res, next)
      .then(() => {
        expect(next.called).to.be.true;
        expect(res.status.called).to.be.false;
        expect(res.json.called).to.be.false;
        expect(req.Resource).to.be.deep.equal(resource);
      });
  });

  it('setDeviceBuild', function (done) {
    let deviceBuildSet = false;
    let redirected = false;

    const req = {
      body: {build: 'build_42'},
      Resource: {
        setDeviceBuild: (value) => {
          deviceBuildSet = true;
          expect(value).to.equal('build_42');
        }
      },
      params: {Resource: 'redirect_target'}
    };

    const res = {redirect: (value) => {
      redirected = true;
      expect(value).to.equal('/api/v0/resources/redirect_target');
    }};

    ResourceController.setDeviceBuild(req, res);

    expect(deviceBuildSet).to.equal(true);
    expect(redirected).to.equal(true);
    done();
  });

  it('solveRoute', function () {
    // solveRoute returns with error
    const errorPromise = new Promise((resolve) => {
      const req = {Resource: {solveRoute: (cb) => {
        cb(new Error('Could not solve route!'));
      }}};

      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(400);
      });

      ResourceController.solveRoute(req, res);
    });

    // solveRoute returns a path
    const validPathPromise = new Promise((resolve) => {
      const req = {Resource: {solveRoute: (cb) => {
        cb(undefined, 'valid route');
      }}};

      const res = new MockResponse((value) => {
        expect(value).to.not.have.property('error');
        expect(value).to.equal('valid route');
        resolve();
      });

      ResourceController.solveRoute(req, res);
    });

    // Resolve all promises
    return Promise.all([
      expect(errorPromise).to.not.be.rejected,
      expect(validPathPromise).to.not.be.rejected
    ]);
  });

  it('paramAlloc', function () {
    // Test with error
    const errorPromise = new Promise((resolve, reject) => {
      const req = {
        params: {Alloc: 'allocation id'},
        Resource: {find: (query, cb) => {
          expect(query).to.have.property('status.allocId', 'allocation id');
          cb(new Error('Could not find anything'));
        }}};

      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(404);
      });

      ResourceController.paramAlloc(req, res, reject.bind(this, 'next should not be called when error happens'));
    });

    // Test without error and results found
    const noErrorWithResultsPromise = new Promise((resolve) => {
      const req = {
        params: {Alloc: 'allocation id'},
        Resource: {find: (query, cb) => {
          expect(query).to.have.property('status.allocId', 'allocation id');
          cb(undefined, ['result1', 'result2', 'result3']);
        }}};

      const res = {};

      ResourceController.paramAlloc(req, res, () => {
        expect(req).to.have.deep.property('allocated');
        expect(req.allocated).to.deep.equal(['result1', 'result2', 'result3']);
        resolve();
      });
    });

    // Test without error and no results
    const noErrorAndNoResultsPromise = new Promise((resolve, reject) => {
      const req = {
        params: {Alloc: 'allocation id'},
        Resource: {find: (query, cb) => {
          expect(query).to.have.property('status.allocId', 'allocation id');
          cb(undefined, []);
        }}};

      const res = new MockResponse((value) => {
        expect(value).to.have.property('error', 'not found');
        resolve();
      }, (value) => {
        expect(value).to.equal(404);
      });

      ResourceController.paramAlloc(req, res,
        reject.bind(this, 'next should not be called when no documents are found'));
    });

    // Resolve all promises
    return Promise.all([
      expect(errorPromise).to.not.be.rejected,
      expect(noErrorWithResultsPromise).to.not.be.rejected,
      expect(noErrorAndNoResultsPromise).to.not.be.rejected
    ]);
  });

  it('getToBody', function () {
    // Parse valid json
    const validJsonPromise = new Promise((resolve) => {
      const req = {query: {alloc: '{ "key1": 19, "key2": "feline" }'}};

      ResourceController.getToBody(req, undefined, () => {
        expect(req).to.have.property('body');
        expect(req.body).to.deep.equal({key1: 19, key2: 'feline'});
        resolve();
      });
    });

    // Parse invalid json, should cause error
    const invalidJsonPromise = new Promise((resolve, reject) => {
      const req = {query: '{ key1: 19, "key2": "feline"'};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(500);
      });

      ResourceController.getToBody(req, res, reject.bind(this, 'next should not be called if error happens'));
    });

    // Resolve all promises
    return Promise.all([
      expect(validJsonPromise).to.not.be.rejected,
      expect(invalidJsonPromise).to.not.be.rejected
    ]);
  });

  it('alloc', function () {
    // Allocate returns error
    const errorPromise = new Promise((resolve) => {
      const req = {Resource: {alloc: (cb) => {
        cb(new Error('Cannot allocate this resource'));
      }}};

      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(500);
      });

      ResourceController.alloc(req, res);
    });

    // Allocate is successful
    const successPromise = new Promise((resolve) => {
      const req = {Resource: {alloc: (cb) => {
        req.allocated = 'allocation';
        cb(undefined, 'document');
      }}};

      const res = new MockResponse((value) => {
        expect(value).to.equal('allocation');
        resolve();
      });

      ResourceController.alloc(req, res);
    });

    // Resolve all promises
    return Promise.all([
      expect(errorPromise).to.not.be.rejected,
      expect(successPromise).to.not.be.rejected
    ]);
  });

  it('release', function () {
    // Release returns error
    const errorPromise = new Promise((resolve) => {
      const req = {Resource: {release: (cb) => {
        cb(new Error('Cannot release this resource'));
      }}};

      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(500);
      });

      ResourceController.release(req, res);
    });

    // Release is successful
    const successPromise = new Promise((resolve) => {
      const req = {Resource: {release: (cb) => {
        req.allocated = 'releasation';
        cb(undefined, 'document');
      }}};

      const res = new MockResponse((value) => {
        expect(value).to.equal('releasation');
        resolve();
      });

      ResourceController.release(req, res);
    });

    // Resolve all promises
    return Promise.all([
      expect(errorPromise).to.not.be.rejected,
      expect(successPromise).to.not.be.rejected
    ]);
  });

  it('allocMultiple', function () {
    // allocateResources returns error
    const errorPromise = new Promise((resolve) => {
      const req = {Resource: {allocateResources: (body, cb) => {
        cb(new Error('Cannot allocate these resources'));
      }}};

      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(404);
      });

      ResourceController.allocMultiple(req, res);
    });

    // allocateResources is successful
    const successPromise = new Promise((resolve) => {
      const req = {Resource: {allocateResources: (body, cb) => {
        cb(undefined, 'allocated_stuff');
      }}};

      const res = new MockResponse((value) => {
        expect(value).to.equal('allocated_stuff');
        resolve();
      });

      ResourceController.allocMultiple(req, res);
    });

    // Resolve all promises
    return Promise.all([
      expect(errorPromise).to.not.be.rejected,
      expect(successPromise).to.not.be.rejected
    ]);
  });

  it('releaseMultiple', function () {
    // Releases fail
    const errorPromise = new Promise((resolve) => {
      const testResources = [
        {
          _id: 1,
          release: (cb) => {
            cb(new Error('Could not release resource'));
          }
        }, {
          _id: 2,
          release: (cb) => {
            cb(new Error('Could not release resource'));
          }
        }, {
          _id: 3,
          release: (cb) => {
            cb(new Error('Could not release resource'));
          }
        }
      ];

      const req = {allocated: testResources};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(500);
      });

      ResourceController.releaseMultiple(req, res);
    });

    // Releases succeed
    const succeedPromise = new Promise((resolve) => {
      const testResources = [
        {
          _id: 1,
          release: (cb) => {
            cb(undefined, 'test1');
          }
        }, {
          _id: 2,
          release: (cb) => {
            cb(undefined, 'test2');
          }
        }, {
          _id: 3,
          release: (cb) => {
            cb(undefined, 'test3');
          }
        }
      ];

      const req = {allocated: testResources};
      const res = new MockResponse((value) => {
        expect(value).to.be.instanceOf(Array);
        expect(value).to.deep.equal(['test1', 'test2', 'test3']);
        resolve();
      });

      ResourceController.releaseMultiple(req, res);
    });

    // Resolve all promises
    return Promise.all([
      expect(errorPromise).to.not.be.rejected,
      expect(succeedPromise).to.not.be.rejected
    ]);
  });
});
