/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
require('colors');
const chai = require('chai');
const chaiSubset = require('chai-subset');
const mongoose = require('mongoose');
const Mockgoose = require('mockgoose').Mockgoose;
const logger = require('winston');
const Promise = require('bluebird');

// Local components
require('../../../app/models/build');
require('../../../app/models/results');
require('../../../app/models/testcase');
const TestcasesController = require('../../../app/controllers/testcases');
const MockResponse = require('../mocking/MockResponse');

const mockTestcases = require('../mocking/MockTestcases');

// Setup
logger.level = 'error';
mongoose.Promise = Promise;
chai.use(chaiSubset);

// Test variables
const mockgoose = new Mockgoose(mongoose);
const expect = chai.expect;
let controller = null;

describe('controllers/testcases.js', () => {
  // Create fresh DB
  before(function () {
    mockgoose.helper.setDbVersion('3.2.1');

    logger.debug('[Before] Preparing storage'.gray);
    return mockgoose.prepareStorage().then(() => {
      logger.debug('[Before] Connecting to mongo\n'.gray);
      return mongoose.connect('mongodb://testmock.com/TestingDB').then(() => {
        // Create controller to test
        controller = new TestcasesController();
      });
    });
  });

  beforeEach(function () {
    return mockgoose.helper.reset();
  });

  after(function (done) {
    logger.debug('[After] Closing mongoose connection'.gray);
    mongoose.disconnect();
    done();
  });

  describe('upsert', function () {
    // Create fresh DB
    beforeEach(function () {
      return controller._model.create(mockTestcases[0]);
    });

    it('upsert - check that req body contains tcid property', function (done) {
      const req = {body: {}};
      const res = new MockResponse(() => {
        done(new Error('Should not call res.json on error case.'));
      }, () => {
        done(new Error('Should not call res.status on error case.'));
      });

      controller.upsert(req, res, (error) => {
        expect(error).to.have.property('name', 'ReferenceError');
        expect(error).to.have.property('message', 'Expected request body to contain a tcid property');
        expect(error).to.have.property('statusCode', 400);
        done();
      });
    });

    it('upsert - should modify the targeted field', function (done) {
      const targetBody = Object.assign({}, mockTestcases[0]);
      targetBody.owner.name = 'Ernesti';

      const req = {body: Object.assign({}, targetBody)};
      delete req.body._id;
      delete req.body.__v;

      const res = new MockResponse((value) => {
        // Strip values that are not part of the JSON format
        targetBody.id = targetBody._id;
        delete targetBody._id;
        delete targetBody.__v;

        expect(value).to.deep.equal(targetBody);
        done();
      }, (status) => {
        expect(status).to.equal(200, 'upsert request should pass');
      });

      controller.upsert(req, res, (error) => {
        done(error);
      });
    });

    it('upsert - should create a new testcase', function (done) {
      const targetBody = Object.assign({}, mockTestcases[1]);
      targetBody.owner.name = 'Luahiala';

      const req = {body: Object.assign({}, targetBody)};
      delete req.body.__v;

      const res = new MockResponse((value) => {
        // Strip values that are not part of the JSON format
        targetBody.id = targetBody._id;
        delete targetBody._id;
        delete targetBody.__v;

        expect(value).to.deep.equal(targetBody);
        done();
      }, (status) => {
        expect(status).to.equal(200, 'upsert request should pass');
      });

      controller.upsert(req, res, (error) => {
        done(error);
      });
    });
  });
});
