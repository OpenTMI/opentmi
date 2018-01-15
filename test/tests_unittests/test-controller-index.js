/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
require('colors');
const _ = require('lodash');
const chai = require('chai');
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const mongoose = require('mongoose');
const Mockgoose = require('mockgoose').Mockgoose;
const logger = require('winston');
const Promise = require('bluebird');

// Local components
const DefaultController = require('./../../app/controllers/index.js');
const MockResponse = require('./mocking/MockResponse.js');
const DummySchema = require('./mocking/DummySchema.js');
const mockDummies = require('./mocking/MockDummyItems.js');

// Setup
logger.level = 'silly';
mongoose.Promise = Promise;
chai.use(chaiSubset);
chai.use(chaiAsPromised);
mongoose.model('DummyItem', DummySchema);

// Test variables
const mockgoose = new Mockgoose(mongoose);
const expect = chai.expect;
const Dummy = mongoose.model('DummyItem');
let mockItem1 = null;
let defaultController = null;

describe('controllers/index.js', function () {
  // Create fresh DB
  before(function () {
    mockgoose.helper.setDbVersion('3.2.1');

    logger.debug('[Before] Preparing storage'.gray);
    return mockgoose.prepareStorage().then(() => {
      logger.debug('[Before] Connecting to mongo\n'.gray);
      return mongoose.connect('mongodb://testmock.com/TestingDB').then(() => {
        // create controller to test
        defaultController = new DefaultController('DummyItem');
      });
    });
  });

  beforeEach(function () {
    return mockgoose.helper.reset().then(() => {
      mockItem1 = new Dummy(mockDummies[0]);
      return mockItem1.save();
    });
  });

  after(function (done) {
    logger.debug('[After] Closing mongoose connection'.gray);
    mongoose.disconnect();
    done();
  });

  it('defaultModelParam', function (done) {
    // Generate defaultModelParam function
    const defaultModelParam = defaultController.defaultModelParam('DummyItem');

    // Mock request and response
    const req = {params: {DummyItem: mockDummies[0]._id}};
    const res = new MockResponse((value) => {
      expect(value).to.not.have.property('error');
      expect(req.DummyItem).to.containSubset(mockDummies[0]);
      done();
    }, (value) => {
      expect(value).to.not.be.oneOf([300, 404]);
    });

    // Call the tested function
    defaultModelParam(req, res, function () {
      expect(req.DummyItem).to.containSubset(mockDummies[0]);
      done();
    }, undefined);
  });

  it('Model - getter', function (done) {
    expect(defaultController.Model.modelName).to.equal('DummyItem');
    done();
  });

  it('all', function (done) {
    defaultController.all({}, {}, done);
  });

  it('get', function () {
    // Optimal case, return item
    const itemExists = new Promise((resolve) => {
      // Mock request and response
      const req = {DummyItem: mockItem1};
      const res = new MockResponse((value) => {
        expect(value).to.be.an('object');
        expect(value).to.containSubset(mockDummies[0]);
        resolve();
      }, (value) => {
        expect(value).to.not.be.oneOf([300, 404]);
      });

      // Call the tested function
      defaultController.get(req, res);
    });

    // Case where DummyItem has not been defined
    const itemDoesNotExist = new Promise((resolve) => {
      // Mock request and response
      const req = {};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(500);
      });

      // Call the tested function
      defaultController.get(req, res);
    });

    // Run all promises
    return Promise.all([
      expect(itemExists).to.not.be.rejected,
      expect(itemDoesNotExist).to.not.be.rejected
    ]);
  });

  it('find', function () {
    // Correct case, find an item that exists
    const itemExists = new Promise((resolve) => {
      // Mock request and response
      const req = {query: {_id: mockItem1._id.toString()}};
      const res = new MockResponse((list) => {
        expect(list).to.be.an('array');
        expect(list.length).to.equal(1);
        expect(list[0]).to.containSubset(mockDummies[0]);
        resolve();
      }, (value) => {
        expect(value).to.not.be.oneOf([300]);
      });

      // Call the tested function
      defaultController.find(req, res);
    });

    // Case where no items match given options
    const itemDoesNotExist = new Promise((resolve) => {
      // Mock request and response
      const req = {query: {_id: '000000000000000000000000'}};
      const res = new MockResponse((list) => {
        expect(list).to.be.an('array');
        expect(list.length).to.equal(0);
        resolve();
      }, (value) => {
        expect(value).to.not.be.oneOf([300]);
      });

      // Call the tested function
      defaultController.find(req, res);
    });

    // Case where given options are invalid
    const optionsAreInvalid = new Promise((resolve) => {
      // Mock request and response
      const req = {query: {_id: 'invalidID'}};
      const res = new MockResponse((list) => {
        expect(list).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(300);
      });

      // Call the tested function
      defaultController.find(req, res);
    });

    // Run all promises
    return Promise.all([
      expect(itemExists).to.not.be.rejected,
      expect(itemDoesNotExist).to.not.be.rejected,
      expect(optionsAreInvalid).to.not.be.rejected
    ]);
  });

  it('create', function () {
    // Correct case, create item with valid body
    const validBody = new Promise((resolve) => {
      // Mock request and response
      const req = {body: mockDummies[1]};
      const res = new MockResponse((value) => {
        expect(value).to.not.have.property('error');
        expect(value).to.containSubset(mockDummies[1]);
        resolve();
      }, (value) => {
        expect(value).to.not.be.oneOf([400]);
      });

      // Call the tested function
      defaultController.create(req, res);
    });

    // Invalid body case
    const invalidBody = new Promise((resolve) => {
      // Mock request and response
      const req = {body: {}};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(400);
      });

      // Call the tested function
      defaultController.create(req, res);
    });

    // Waterfall cases
    return Promise.all([
      expect(validBody).to.not.be.rejected,
      expect(invalidBody).to.not.be.rejected
    ]);
  });

  it('update', function () {
    // Correct case, update item with valid body
    const validBody = new Promise((resolve) => {
      // Mock request and response
      const mockDataCopy = JSON.parse(JSON.stringify(mockDummies[0]));
      mockDataCopy.text_freeform = 'modified text';

      const req = {params: {DummyItem: mockItem1}, body: mockDataCopy};
      const res = new MockResponse((value) => {
        expect(value).to.not.have.property('error');
        expect(value).to.containSubset(
          _.assign(
            {},
            mockDummies[0],
            _.pick(mockDataCopy, ['text_freeform'])));
        resolve();
      }, (value) => {
        expect(value).to.not.be.oneOf([400]);
      });

      // Call the tested function
      defaultController.update(req, res);
    });

    // Invalid body case
    const invalidBody = new Promise((resolve) => {
      // Mock request and response
      const req = {params: {DummyItem: mockItem1}, body: {number_defaulted_pos: -2}};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(400);
      });

      // Call the tested function
      defaultController.update(req, res);
    });

    // Waterfall cases
    return Promise.all([
      expect(validBody).to.not.be.rejected,
      expect(invalidBody).to.not.be.rejected
    ]);
  });

  it('remove', function () {
    // Correct case, item is found and deleted
    const itemExists = new Promise((resolve) => {
      // Mock request and response
      const req = {params: {DummyItem: 'DummyItem'}, DummyItem: mockItem1};
      const res = new MockResponse((value) => {
        expect(value).to.not.have.property('error');
        expect(value).to.be.an('object');
        expect(Object.keys(value).length).to.equal(0);
        resolve();
      }, (value) => {
        expect(value).to.equal(200);
      });

      // Call the tested function
      defaultController.remove(req, res);
    });

    // Invalid case, item does not exist
    const itemDoesNotExist = new Promise((resolve) => {
      // Mock request and response
      const req = {params: {DummyItem: 'DummyItem'}};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(500);
      });

      // Call the tested function
      defaultController.remove(req, res);
    });

    // Run all promises
    return Promise.all([
      expect(itemExists).to.not.be.rejected,
      expect(itemDoesNotExist).to.not.be.rejected
    ]);
  });

  it('isEmpty', function (done) {
    defaultController.isEmpty((firstResult) => {
      // There should be one element in the database so result should be false
      expect(firstResult).to.equal(false);

      // Remove the one dummy element from the database
      Dummy.findOneAndRemove({_id: mockDummies[0]._id}).then(() => {
        // Result should now be true
        defaultController.isEmpty((secondResult) => {
          expect(secondResult).to.equal(true);
          done();
        });
      });
    });
  });
});
