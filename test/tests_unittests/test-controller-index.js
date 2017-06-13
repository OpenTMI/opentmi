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
const DefaultController = require('./../../app/controllers/index.js');


const expect = chai.expect;
const mockgoose = new Mockgoose(mongoose);
let defaultController = null;

// Define testing schema
const DummyItemSchema = new mongoose.Schema({
  text_unique_sparse: { type: String, unique: true, sparse: true },
  text_unique_required: { type: String, unique: true, required: true },
  text_freeform: { type: String },
  number_defaulted_pos: { type: Number, default: 0, min: 0 },
  number_required: { type: Number, required: true },
  number_freeform: { type: Number },
  string_enum: {
    type: String,
    enum: [
      'category1',
      'category2',
      'category3',
      'category4',
    ],
    default: 'category1' },
  date: { type: Date },
});
DummyItemSchema.plugin(QueryPlugin);

// Add mock data
const mockData1 = {
  _id: mongoose.Types.ObjectId(),
  text_unique_sparse: 'stuff_1_2_3',
  text_unique_required: 'secondary_stuff_2_4_6',
  text_freeform: 'random stuff',
  number_defaulted_pos: 73,
  number_required: 9314,
  number_freeform: 42063,
  string_enum: 'category2',
  date: new Date('01.02.2017'),
};
const mockData2 = {
  text_unique_sparse: 'another stuff',
  text_unique_required: 'another secondary_stuff',
  text_freeform: 'another random stuff',
  number_defaulted_pos: 974,
  number_required: 13046,
  number_freeform: 15285,
  string_enum: 'category3',
  date: new Date('07.11.2017'),
};

let mockItem1 = null;
let Dummy = null;

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

describe('controllers/index.js', () => {
  // Create fresh DB
  before((done) => {
    console.log('    [Before]');
    console.log('     * Preparing storage');
    mockgoose.prepareStorage().then(() => {
      mongoose.connect('mongodb://testmock.com/TestingDB', (error) => {
      console.log('     * Connecting to mongo\n');
        should.not.exist(error);
        mongoose.model('DummyItem', DummyItemSchema);
        defaultController = new DefaultController('DummyItem');

        // Some library, probably mockgoose, leaks this global variable that needs to be purged
        delete check;

        Dummy = mongoose.model('DummyItem');
        done();
      });
    });
  });

  beforeEach((done) => {
    mockgoose.helper.reset().then(() => {
      // Load mock items
      mockItem1 = new Dummy(mockData1);
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

  it('defaultModelParam', (done) => {
    // Generate defaultModelParam function
    const defaultModelParam = defaultController.defaultModelParam('DummyItem');

    // Mock request and response
    const req = { params: { DummyItem: mockData1._id } };
    const res = new MockResponse((value) => {
      should.not.exist(value.error);
      expect(req.DummyItem).to.containSubset(mockData1);
      done();
    }, (value) => {
      expect(value).to.not.be.oneOf([300, 404]);
    });

    // Call the tested function
    defaultModelParam(req, res, () => {
      expect(req.DummyItem).to.containSubset(mockData1);
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
        expect(value).to.containSubset(mockData1);
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
        expect(list[0]).to.containSubset(mockData1);
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
      const req = { body: mockData2 };
      const res = new MockResponse((value) => {
        should.not.exist(value.error);
        expect(value).to.containSubset(mockData2);
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
      const mockDataCopy = JSON.parse(JSON.stringify(mockData1));
      mockDataCopy.text_freeform = 'modified text';

      const req = { params: { DummyItem: mockItem1 }, body: mockDataCopy };
      const res = new MockResponse((value) => {
        should.not.exist(value.error);
        expect(value).to.containSubset(mockData1);
        next();
      }, (value) => {
        expect(value).to.not.be.oneOf([300]);
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
        expect(value).to.equal(300);
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
      Dummy.findOneAndRemove({ _id: mockData1._id }).then(() => {
        // Result should now be true
        defaultController.isEmpty((secondResult) => {
          expect(secondResult).to.equal(true);
          done();
        });
      });
    });
  });
});
