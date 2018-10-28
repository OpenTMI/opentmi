/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const _ = require('lodash');
const mongoose = require('mongoose');
const Promise = require('bluebird');

// Local components
const chai = require('../../chai');
const DefaultController = require('./../../../app/controllers/index.js');
const MockResponse = require('./mocking/MockResponse.js');
const DummySchema = require('./mocking/DummySchema.js');
const mockDummies = require('./mocking/MockDummyItems.js');

const {setup, reset, teardown} = require('./../../utils/mongomock');

mongoose.model('DummyItem', DummySchema);

// Test variables
const {expect} = chai;
const Dummy = mongoose.model('DummyItem');
let mockItem1 = null;
let defaultController = null;

describe('controllers/index.js', function () {
  // Create fresh DB
  before(setup);
  before(function () {
    defaultController = new DefaultController('DummyItem');
  });
  beforeEach(reset);
  beforeEach(function () {
    mockItem1 = new Dummy(mockDummies[0]);
    return mockItem1.save();
  });
  after(teardown);

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

  it('isEmpty promise', function () {
    return defaultController.isEmpty()
      .then((firstResult) => {
        // There should be one element in the database so result should be false
        expect(firstResult).to.equal(false);
        // Remove the one dummy element from the database
        return Dummy.findOneAndRemove({_id: mockDummies[0]._id});
      })
      .then(() =>
        // Result should now be true
        defaultController.isEmpty())
      .then((empty) => {
        expect(empty).to.equal(true);
      });
  });
  it('isEmpty cb', function (done) {
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
