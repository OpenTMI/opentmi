// Third party components
const async = require('async');
const should = require('should');
const chai = require('chai');
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const QueryPlugin = require('mongoose-query');
const Mockgoose = require('mockgoose').Mockgoose;

const winston = require('winston');
winston.level = 'error';

// Local components
const ItemController = require('./../../app/controllers/items.js');
let Item = undefined;

const expect = chai.expect;
const mockgoose = new Mockgoose(mongoose);
let controller = null;

// Add mock data
const mockData1 = {
  _id: mongoose.Types.ObjectId(),
  name: 'testing_item',
  in_stock: 35,
  available: 10,
  category : 'accessory',
};
let mockItem1 = null;

class MockResponse {
  constructor(jsonTest, statusTest) {
    this.jsonTest = jsonTest;
    this.statusTest = statusTest;
  }

  json(value) {
    if (this.jsonTest) this.jsonTest(value);
  }

  status(value) {
    this.statusCalled = true;
    if (this.statusTest) { this.statusTest(value); }
    return this;
  }
}


describe('controllers/items.js', () => {
  // Create fresh DB
  before((done) => {
    console.log('    [Before]');
    console.log('     * Preparing storage');
    mockgoose.prepareStorage().then(() => {
      console.log('     * Connecting to mongo\n');
      mongoose.connect('mongodb://testmock.com/TestingDB', (error) => {
        should.not.exist(error);
         
        // Loading model requires active mongo 
        require('./../../app/models/item.js');

        // Create controller to test
        controller = new ItemController('Item');

        // Some library, probably mockgoose, leaks this global variable that needs to be purged
        delete check;
        done();
      });
    });
  });

  beforeEach((done) => {
    mockgoose.helper.reset().then(() => {
      // Load mock items
      mockItem1 = new controller.Model(mockData1);
      mockItem1.save((error) => {
        should.not.exist(error);
        done();
      });
    });
  });

  after((done) => {
    console.log('\n    [After]');
    console.log('     * Closing mongoose connection');
    mongoose.disconnect();
    done();
  });

  it('update', (done) => {
    // Valid case, remove 7 items from stock, should be left with 3 available
    function validStockDecrease(next) {
      const req = { body: { in_stock: mockItem1.in_stock - 7 }, Item: mockItem1 };
      const res = new MockResponse((value) => {
        should.not.exist(value.error);
        expect(value.in_stock).to.equal(mockData1.in_stock - 7);
        expect(value.available).to.equal(mockData1.available - 7);
        next();
      }, (value) => {
        expect(value).to.equal(200);
      });

      controller.update(req, res);
    }

    // Valid case, tweaking availability by 5, should increase in_stock by 5
    function validAvailabilityTweak(next) {
      const req = { body: { available: mockItem1.available + 5 }, Item: mockItem1 };
      const res = new MockResponse((value) => {
        should.not.exist(value.error);
        expect(value.in_stock).to.equal(mockData1.in_stock - 7 + 5);
        expect(value.available).to.equal(mockData1.available - 7 + 5);
        next();
      }, (value) => {
        expect(value).to.equal(200);
      });

      controller.update(req, res);
    }

    // Valid case, modifying both availability and in_stock
    function validInstockAvailableCombination(next) {
      const req = { body: { in_stock: 6, available: 4 }, Item: mockItem1 };
      const res = new MockResponse((value) => {
        should.not.exist(value.error);
        expect(value.in_stock).to.equal(6);
        expect(value.available).to.equal(4);
        next();
      }, (value) => {
        expect(value).to.equal(200);
      });

      controller.update(req, res);
    }

    // Invalid case, removing too many items from in_stock
    function invalidStockDecrease(next) {
      const req = { body: { in_stock: mockItem1.in_stock - 40 }, Item: mockItem1 };
      const res = new MockResponse((value) => {
        should.exist(value.error);
        next();
      }, (value) => {
        expect(value).to.equal(400);
      });

      controller.update(req, res);
    }

    // Invalid case, tweaking available too hard
    function invalidAvailabilityTweak(next) {
      const req = { body: { available: mockItem1.available - 16 }, Item: mockItem1 };
      const res = new MockResponse((value) => {
        should.exist(value.error);
        next();
      }, (value) => {
        expect(value).to.equal(400);
      });

      controller.update(req, res);
    }

    // Valid case, modifying both availability and in_stock
    function invalidInstockAvailableCombination(next) {
      const req = { body: { in_stock: 8, available: 10 }, Item: mockItem1 };
      const res = new MockResponse((value) => {
        should.exist(value.error);
        next();
      }, (value) => {
        expect(value).to.equal(400);
      });

      controller.update(req, res);
    }

    // Waterfall tasks
    async.waterfall([
      validStockDecrease,
      validAvailabilityTweak,
      validInstockAvailableCombination,
      invalidStockDecrease,
      invalidAvailabilityTweak,
      invalidInstockAvailableCombination,
    ], done);
  });

  it('_handleUpdateInStock', (done) => {
    const req = { body: { in_stock: 10 }, Item: { in_stock: 8, available: 4 } };
    ItemController._handleUpdateInStock(req);

    // Expect controller to automagically also increase available
    expect(req.body.in_stock).to.equal(10);
    expect(req.body.available).to.equal(6);

    done();
  });

  it('_handleUpdateAvailable', (done) => {
    const req = { body: { available: 16 }, Item: { in_stock: 10, available: 8 } };
    ItemController._handleUpdateAvailable(req);

    // Expect controller to automagically also increase in_stock
    expect(req.body.in_stock).to.equal(18);
    expect(req.body.available).to.equal(16);

    done();
  });

  it('getImage', (done) => {
    // Mock error happening
    function validCase(next) {
      const req = { 
        Item: { 
          fetchImageData: (cb) => {
            cb({ type: '*type_block', data: '*data_block' }); 
          }
        }
      };

      const res = new MockResponse();
      res.set = (key, value) => {
        expect(key).to.equal('Content-Type');
        expect(value).to.equal('*type_block');
      };
      res.send = (data) => {
        expect(data).to.equal('*data_block');
        next();
      };

      ItemController.getImage(req, res);
    }

    // Mock error happening
    function errorCase(next) {
      const req = { 
        Item: { 
          fetchImageData: (cb) => {
            cb(new Error('This is serious - test'));
          }
        }
      }
      const res = new MockResponse((value) => {
        should.exist(value.error);
        next();
      }, (value) => {
        expect(value).to.equal(400);
      });

      ItemController.getImage(req, res);
    }

    // Waterfall tasks
    async.waterfall([
      validCase,
      errorCase,
    ], done);
  });
});
