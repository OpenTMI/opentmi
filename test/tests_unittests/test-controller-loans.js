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
const LoanController = require('./../../app/controllers/loans.js');
let Item = undefined;
let User = undefined;

const expect = chai.expect;
const mockgoose = new Mockgoose(mongoose);
let controller = null;

// Mock user schema
const mockUserSchema = new mongoose.Schema({
  name: { type: String }
});

// Add mock data
const mockItemData1 = {
  _id: mongoose.Types.ObjectId(),
  name: 'testing_item',
  in_stock: 18,
  available: 18,
  category : 'accessory',
};
const mockUserData1 = {
  _id: mongoose.Types.ObjectId(),
  name: 'Kari-Pekka',
};
const mockLoanData1 = {
  _id: mongoose.Types.ObjectId(),
  loan_date: new Date(),
  loaner: mockUserData1._id,
  items : [{
    item: mockItemData1._id,
    resource: undefined,
  }, {
    item: mockItemData1._id,
    resource: undefined,
  }, {
    item: mockItemData1._id,
    resource: undefined,
  }],
};

let mockItem1 = null;
let mockUser1 = null;
let mockLoan1 = null;

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


describe('controllers/loans.js', () => {
  // Create fresh DB
  before((done) => {
    console.log('    [Before]');
    console.log('     * Preparing storage');
    mockgoose.prepareStorage().then(() => {
      console.log('     * Connecting to mongo\n');
      mongoose.connect('mongodb://testmock.com/TestingDB', (error) => {
        should.not.exist(error);
         
        // Loading models requires active mongo
        mongoose.model('User', mockUserSchema);
        require('./../../app/models/item.js');
        require('./../../app/models/loan.js');

        User = mongoose.model('User');
        Item = mongoose.model('Item');

        // Create controller to test
        controller = new LoanController('Loan');

        // Some library, probably mockgoose, leaks this global variable that needs to be purged
        delete check;

        console.log('    [Tests]');
        done();
      });
    });
  });

  beforeEach((done) => {
    mockgoose.helper.reset().then(() => {
      // Load mock item
      mockItem1 = new Item(mockItemData1);
      mockItem1.save((error) => {
        should.not.exist(error);
        // Load mock user
        mockUser1 = new User(mockUserData1);
        mockUser1.save((error) => {
          // Load mock loan
          mockLoan1 = new controller.Model(mockLoanData1);
          mockLoan1.save((error) => {
            should.not.exist(error);
            done();
          });
        });
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
    // Valid case, return 1 item from loan
    function validReturn(next) {
      const req = { params: { Loan: mockLoan1._id }, body: { items: [ { _id: mockLoan1.items[1]._id, return_date: new Date() } ] }, Loan: mockLoan1 };
      const res = new MockResponse((value) => {
        should.not.exist(value.error);
        should.exist(value.items[1].return_date);
        next();
      }, (value) => {
        expect(value).to.equal(200);
      });

      controller.update(req, res);
    }

    // Invalid case, return 1 item that is not in the loan
    function invalidReturnMissingId(next) {
      const req = { params: { Loan: mockLoan1._id}, body: { items: [ { _id: mockUser1._id, return_date: new Date() } ] }, Loan: mockLoan1 };
      const res = new MockResponse((value) => {
        should.exist(value.error);
        next();
      }, (value) => {
        expect(value).to.equal(400);
      });

      controller.update(req, res);
    }

    // Invalid case, attempt to update with invalid loan_date
    function invalidUpdate(next) {
      const req = { params: { Loan: mockLoan1._id }, body: { loan_date: 'fake_date' }, Loan: mockLoan1 };
      const res = new MockResponse((value) => {
        should.exist(value.error);
        next();
      }, (value) => {
        expect(value).to.equal(400);
      });

      controller.update(req, res);
    }

    async.waterfall([
      validReturn, 
      invalidReturnMissingId, 
      invalidUpdate,
    ], done);
  });
  
  it('_handleItemsInUpdate', (done) => {
    const req = {
      params: { Loan: mockLoan1._id },
      body: { },
      Loan: mockLoan1
    }

    // Handle single valid item
    function validSingleItem(next) {
      req.body.items = [ { _id: mockLoan1.items[0]._id, return_date: new Date() }, ];
      LoanController._handleItemsInUpdate(req, (err) => {
        should.not.exist(err);
        should.not.exist(req.body.items); // should be dereferenced by _handleItemsInUpdate
        should.exist(mockLoan1.items[0].return_date);
        next();
      });
    }
  
    // Handle multiple valid items
    function validMultipleItems(next) {
      req.body.items = [ { _id: mockLoan1.items[1]._id, return_date: new Date() }, 
                         { _id: mockLoan1.items[2]._id, return_date: new Date() }, ];
      LoanController._handleItemsInUpdate(req, (err) => {
        should.not.exist(err);
        should.not.exist(req.body.items); // should be dereferenced by _handleItemsInUpdate
        should.exist(mockLoan1.items[1].return_date);
        should.exist(mockLoan1.items[2].return_date);
        next();
      });
    }
 
    // Handle invalid item
    function invalidItem(next) {
      req.body.items = [ { return_date: new Date() }, ];
      LoanController._handleItemsInUpdate(req, (err) => {
        should.exist(err);
        next();
      });
    }

    // Waterfall tasks
    async.waterfall([
      validSingleItem,
      validMultipleItems,
      invalidItem
    ], done);
  });

  it('findUsersLoans', (done) => {
    // Get loans of existing user, should return 1
    function validUserWithLoans(next) {
      const req = { user: { sub: mockUser1._id.toString() } };
      const res = new MockResponse((value) => {
        should.not.exist(value.error);
        should.exist(value);
        
        // Check loan fields
        expect(value).to.not.be.empty;
        should.exist(value[0]._id);
        should.exist(value[0].loaner);
        should.exist(value[0].__v);
        should.exist(value[0].items);

        // Check items
        expect(value[0].items).to.not.be.empty;
        for (let i = 0; i < 3; i += 1) {
          expect(value[0].items[i]._id.toString()).to.equal(mockLoan1.items[i]._id.toString());
          expect(value[0].items[i].item.toString()).to.equal(mockLoan1.items[i].item.toString());
          should.not.exist(value[0].items[i].return_date);
        }

        next();
      }, (value) => {
        expect(value).to.not.be.oneOf([500]);
      });

      controller.findUsersLoans(req, res);
    }
  
    // Get loans for invalid user, should return status 500 
    function invalidUser(next) {
      const req = { user: { sub: 42 } };
      const res = new MockResponse((value) => {
        should.exist(value.error);
        next();
      }, (value) => {
        expect(value).to.equal(500);
      });

      controller.findUsersLoans(req, res);
    }

    // Waterfall tasks
    async.waterfall([
      validUserWithLoans,
       invalidUser
    ], done);
  });
});
