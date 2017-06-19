// Third party components
const colors = require('colors');

const async = require('async');
const should = require('should');
const chai = require('chai');
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);
const expect = chai.expect;

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const Mockgoose = require('mockgoose').Mockgoose;
const mockgoose = new Mockgoose(mongoose);

const winston = require('winston');
winston.level = 'error';

// Local components
const DefaultController = require('./../../app/controllers/index.js');
let defaultController = null;

const DummyItemSchema = require('./mocking/DummySchema.js');
const mockDummies = require('./mocking/MockDummyItems.js');

let mockItem1 = null;
let Dummy = null;
const MockResponse = require('./mocking/MockResponse.js');


describe('controllers/index.js', () => {
  // Create fresh DB
  before((done) => {
    console.log('    [Before]'.gray);
    console.log('    * Preparing storage'.gray);
    mockgoose.prepareStorage().then(() => {
      mongoose.connect('mongodb://testmock.com/TestingDB', (error) => {
      console.log('    * Connecting to mongo\n'.gray);
        should.not.exist(error);
        mongoose.model('DummyItem', DummyItemSchema);

        // Some library, probably mockgoose, leaks this global variable that needs to be purged
        delete check;

        Dummy = mongoose.model('DummyItem');
        console.log('    [Tests]'.gray);
        done();
      });
    });
  });

  beforeEach((done) => {
    mockgoose.helper.reset().then(() => {
      // Load mock items
      mockItem1 = new Dummy(mockDummies[0]);
      mockItem1.save((error) => {
        should.not.exist(error);
        done();
      });
    });
  });

  after((done) => {
    console.log('\n    [After]'.gray);
    console.log('    * Closing mongoose connection'.gray);
    mongoose.disconnect();
    done();
  });

  it('constructor', (done) => {
    // create controller to test
    defaultController = new DefaultController('DummyItem');
    should.exist(defaultController);
    done();
  });

  it('defaultModelParam', (done) => {
    // Generate defaultModelParam function
    const defaultModelParam = defaultController.defaultModelParam('DummyItem');

    // Mock request and response
    const req = { params: { DummyItem: mockDummies[0]._id } };
    const res = new MockResponse((value) => {
      should.not.exist(value.error);
      expect(req.DummyItem).to.containSubset(mockDummies[0]);
      done();
    }, (value) => {
      expect(value).to.not.be.oneOf([300, 404]);
    });

    // Call the tested function
    defaultModelParam(req, res, () => {
      expect(req.DummyItem).to.containSubset(mockDummies[0]);
      done();
    }, undefined);
  });

  it('Model - getter', (done) => {
    defaultController.Model.modelName.should.equal('DummyItem');
    done();
  });

  it('all', (done) => {
    defaultController.all({}, {}, done);
  });

  it('get', (done) => {
    // Optimal case, return item
    function itemExists(next) {
      // Mock request and response
      const req = { DummyItem: mockItem1 };
      const res = new MockResponse((value) => {
        expect(value).to.be.an('object');
        expect(value).to.containSubset(mockDummies[0]);
        next();
      }, (value) => {
        expect(value).to.not.be.oneOf([300, 404]);
      });

      // Call the tested function
      defaultController.get(req, res);
    }

    // Case where DummyItem has not been defined
    function itemDoesNotExist(next) {
      // Mock request and response
      const req = {};
      const res = new MockResponse((value) => {
        should.exist(value.error);
        next();
      }, (value) => {
        expect(value).to.equal(500);
      });

      // Call the tested function
      defaultController.get(req, res);
    }

    // Waterfall tasks
    async.waterfall([
      itemExists,
      itemDoesNotExist,
    ], done);
  });

  it('find', (done) => {
    // Correct case, find an item that exists
    function itemExists(next) {
      // Mock request and response
      const req = { query: { _id: mockItem1._id.toString() } };
      const res = new MockResponse((list) => {
        expect(list).to.be.an('array');
        expect(list.length).to.equal(1);
        expect(list[0]).to.containSubset(mockDummies[0]);
        next();
      }, (value) => {
        expect(value).to.not.be.oneOf([300]);
      });

      // Call the tested function
      defaultController.find(req, res);
    }

    // Case where no items match given options
    function itemDoesNotExist(next) {
      // Mock request and response
      const req = { query: { _id: '000000000000000000000000' } };
      const res = new MockResponse((list) => {
        expect(list).to.be.an('array');
        expect(list.length).to.equal(0);
        next();
      }, (value) => {
        expect(value).to.not.be.oneOf([300]);
      });

      // Call the tested function
      defaultController.find(req, res);
    }

    // Case where given options are invalid
    function optionsAreInvalid(next) {
      // Mock request and response
      const req = { query: { _id: 'invalidID' } };
      const res = new MockResponse((list) => {
        should.exist(list.error);
        next();
      }, (value) => {
        expect(value).to.equal(300);
      });

      // Call the tested function
      defaultController.find(req, res);
    }

    // Waterfall cases
    async.waterfall([
      itemExists,
      itemDoesNotExist,
      optionsAreInvalid,
    ], done);
  });

  it('create', (done) => {
    // Correct case, create item with valid body
    function validBody(next) {
      // Mock request and response
      const req = { body: mockDummies[1] };
      const res = new MockResponse((value) => {
        should.not.exist(value.error);
        expect(value).to.containSubset(mockDummies[1]);
        next();
      }, (value) => {
        expect(value).to.not.be.oneOf([400]);
      });

      // Call the tested function
      defaultController.create(req, res);
    }

    // Invalid body case
    function invalidBody(next) {
      // Mock request and response
      const req = { body: {} };
      const res = new MockResponse((value) => {
        should.exist(value.error);
        next();
      }, (value) => {
        expect(value).to.equal(400);
      });

      // Call the tested function
      defaultController.create(req, res);
    }

    // Waterfall cases
    async.waterfall([
      validBody,
      invalidBody,
    ], done);
  });

  it('update', (done) => {
    // Correct case, update item with valid body
    function validBody(next) {
      // Mock request and response
      const mockDataCopy = JSON.parse(JSON.stringify(mockDummies[0]));
      mockDataCopy.text_freeform = 'modified text';

      const req = { params: { DummyItem: mockItem1 }, body: mockDataCopy };
      const res = new MockResponse((value) => {
        should.not.exist(value.error);
        expect(value).to.containSubset(mockDummies[0]);
        next();
      }, (value) => {
        expect(value).to.not.be.oneOf([400]);
      });

      // Call the tested function
      defaultController.update(req, res);
    }

    // Invalid body case
    function invalidBody(next) {
      // Mock request and response
      const req = { params: { DummyItem: mockItem1 }, body: { number_defaulted_pos: -2 } };
      const res = new MockResponse((value) => {
        should.exist(value.error);
        next();
      }, (value) => {
        expect(value).to.equal(400);
      });

      // Call the tested function
      defaultController.update(req, res);
    }

    // Waterfall cases
    async.waterfall([
      validBody,
      invalidBody,
    ], done);
  });

  it('remove', (done) => {
    // Correct case, item is found and deleted
    function itemExists(next) {
      // Mock request and response
      const req = { params: { DummyItem: 'DummyItem' }, DummyItem: mockItem1 };
      const res = new MockResponse((value) => {
        should.not.exist(value.error);
        expect(value).to.be.an('object');
        expect(Object.keys(value).length).to.equal(0);
        next();
      }, (value) => {
        expect(value).to.equal(200);
      });

      // Call the tested function
      defaultController.remove(req, res);
    }

    // Invalid case, item does not exist
    function itemDoesNotExist(next) {
      // Mock request and response
      const req = { params: { DummyItem: 'DummyItem' } };
      const res = new MockResponse((value) => {
        should.exist(value.error);
        next();
      }, (value) => {
        expect(value).to.equal(500);
      });

      // Call the tested function
      defaultController.remove(req, res);
    }

    // Waterfall cases
    async.waterfall([
      itemExists,
      itemDoesNotExist,
    ], done);
  });

  it('isEmpty', (done) => {
    defaultController.isEmpty((firstResult) => {
      // There should be one element in the database so result should be false
      expect(firstResult).to.equal(false);

      // Remove the one dummy element from the database
      Dummy.findOneAndRemove({ _id: mockDummies[0]._id }).then(() => {
        // Result should now be true
        defaultController.isEmpty((secondResult) => {
          expect(secondResult).to.equal(true);
          done();
        });
      });
    });
  });
});
