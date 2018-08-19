/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
require('colors');
const chai = require('chai');
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const mongoose = require('mongoose');
const logger = require('winston');
const Promise = require('bluebird');

// Local components
require('./../../app/models/item.js');
const ItemController = require('./../../app/controllers/items.js');
const MockResponse = require('./mocking/MockResponse.js');
const mockItems = require('./mocking/MockItems.js');

// Setup
logger.level = 'error';
mongoose.Promise = Promise;
chai.use(chaiSubset);
chai.use(chaiAsPromised);

const {setup, reset, teardown} = require('./mongomock');


// Test variables
const expect = chai.expect;
let mockInstances = [];
let controller = null;

describe('controllers/items.js', function () {
  // Create fresh DB
  before(setup);
  before(function () {
    // Create controller to test
    controller = new ItemController();
  });

  beforeEach(reset);
  beforeEach(function () {
    // Load mock items
    const saves = [];
    mockInstances = [];
    for (let i = 0; i < mockItems.length; i += 1) {
      mockInstances.push(new controller.Model(mockItems[i]));
      saves.push(mockInstances[i].save());
    }
    return Promise.all(saves);
  });
  after(teardown);

  it('update', function () {
    // Valid case, remove 7 items from stock, should be left with 3 available
    const validStockDecrease = new Promise((resolve) => {
      const req = {body: {in_stock: mockInstances[0].in_stock - 7}, Item: mockInstances[0]};
      const res = new MockResponse((value) => {
        expect(value).to.not.have.property('error');
        expect(value).to.have.property('in_stock', mockItems[0].in_stock - 7);
        expect(value).to.have.property('available', mockItems[0].available - 7);
        resolve();
      }, (value) => {
        expect(value).to.equal(200);
      });

      controller.update(req, res);
    });

    // Valid case, tweaking availability by 5, should increase in_stock by 5
    const validAvailabilityTweak = new Promise((resolve) => {
      const req = {body: {available: mockInstances[1].available + 5}, Item: mockInstances[1]};
      const res = new MockResponse((value) => {
        expect(value).to.not.have.property('error');
        expect(value).to.have.property('in_stock', mockItems[1].in_stock + 5);
        expect(value).to.have.property('available', mockItems[1].available + 5);
        resolve();
      }, (value) => {
        expect(value).to.equal(200);
      });

      controller.update(req, res);
    });

    // Valid case, modifying both availability and in_stock
    const validInstockAvailableCombination = new Promise((resolve) => {
      const req = {body: {in_stock: 6, available: 4}, Item: mockInstances[2]};
      const res = new MockResponse((value) => {
        expect(value).to.not.have.property('error');
        expect(value).to.have.property('in_stock', 6);
        expect(value).to.have.property('available', 4);
        resolve();
      }, (value) => {
        expect(value).to.equal(200);
      });

      controller.update(req, res);
    });

    // Invalid case, removing too many items from in_stock
    const invalidStockDecrease = new Promise((resolve) => {
      const req = {body: {in_stock: mockInstances[3].in_stock - 16}, Item: mockInstances[3]};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(400);
      });

      controller.update(req, res);
    });

    // Invalid case, tweaking available too hard
    const invalidAvailabilityTweak = new Promise((resolve) => {
      const req = {body: {available: mockInstances[4].available - 4}, Item: mockInstances[4]};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(400);
      });

      controller.update(req, res);
    });

    // Invalid case, modifying both availability and in_stock
    const invalidInstockAvailableCombination = new Promise((resolve) => {
      const req = {body: {in_stock: 8, available: 10}, Item: mockInstances[5]};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(400);
      });

      controller.update(req, res);
    });

    // Go through all promises in order
    return Promise.all([
      expect(validStockDecrease).to.not.be.rejected,
      expect(validAvailabilityTweak).to.not.be.rejected,
      expect(validInstockAvailableCombination).to.not.be.rejected,
      expect(invalidStockDecrease).to.not.be.rejected,
      expect(invalidAvailabilityTweak).to.not.be.rejected,
      expect(invalidInstockAvailableCombination).to.not.be.rejected
    ]);
  });

  it('_handleUpdateInStock', function (done) {
    const req = {body: {in_stock: 10}, Item: {in_stock: 8, available: 4}};
    ItemController._handleUpdateInStock(req);

    // Expect controller to automagically also increase available
    expect(req.body.in_stock).to.equal(10);
    expect(req.body.available).to.equal(6);

    done();
  });

  it('_handleUpdateAvailable', function (done) {
    const req = {body: {available: 16}, Item: {in_stock: 10, available: 8}};
    ItemController._handleUpdateAvailable(req);

    // Expect controller to automagically also increase in_stock
    expect(req.body.in_stock).to.equal(18);
    expect(req.body.available).to.equal(16);

    done();
  });

  it('getImage', function () {
    // Mock error happening
    const validCase = new Promise((resolve) => {
      const req = {Item: {fetchImageData: (cb) => {
        cb({type: '*type_block', data: '*data_block'});
      }}};
      const res = new MockResponse();
      res.set = (key, value) => {
        expect(key).to.equal('Content-Type');
        expect(value).to.equal('*type_block');
      };
      res.send = (data) => {
        expect(data).to.equal('*data_block');
        resolve();
      };

      ItemController.getImage(req, res);
    });

    // Mock error happening
    const errorCase = new Promise((resolve) => {
      const req = {Item: {fetchImageData: (cb) => {
        cb(new Error('This is serious - test'));
      }}};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(400);
      });

      ItemController.getImage(req, res);
    });

    // Run all promises
    return Promise.all([
      expect(validCase).to.not.be.rejected,
      expect(errorCase).to.not.be.rejected
    ]);
  });
});
