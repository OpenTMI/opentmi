// Third party components
const colors = require('colors');

const chai = require('chai');
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiSubset);
chai.use(chaiAsPromised);
const expect = chai.expect;

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const Mockgoose = require('mockgoose').Mockgoose;
const mockgoose = new Mockgoose(mongoose);

const winston = require('winston');
winston.level = 'error';

// Local components
const LoanController = require('./../../app/controllers/loans.js');
let controller = null;

let Item = undefined;
let User = undefined;

// Mock user schema
const mockUserSchema = new mongoose.Schema({
  name: { type: String }
});

// Add mock data
const mockItems = require('./mocking/MockItems.js');
const mockUsers = require('./mocking/MockUsers.js');
const mockLoans = require('./mocking/MockLoans.js');

let mockItem1 = null;
let mockUser1 = null;
let mockLoan1 = null;

const MockResponse = require('./mocking/MockResponse.js');


describe('controllers/loans.js', function () {
  // Create fresh DB
  before(function (done) {
    console.log('    [Before]'.gray);
    console.log('    * Preparing storage'.gray);
    mockgoose.prepareStorage().then(() => {
      console.log('    * Connecting to mongo\n'.gray);
      mongoose.connect('mongodb://testmock.com/TestingDB', (error) => {
        expect(error).to.not.exist;

        // Loading models requires active mongo
        try {
          require('./../../app/models/group.js');
        } catch (e) {
          if (e.name !== 'OverwriteModelError') { throw (e); }
        }

        try {
          require('./../../app/models/user.js');
        } catch (e) {
          if (e.name !== 'OverwriteModelError') { throw (e); }
        }

        try {
          require('./../../app/models/item.js');
        } catch (e) {
          if (e.name !== 'OverwriteModelError') { throw (e); }
        }

        try {
          require('./../../app/models/loan.js');
        } catch (e) {
          if (e.name !== 'OverwriteModelError') { throw (e); }
        }

        User = mongoose.model('User');
        Item = mongoose.model('Item');

         // Create controller to test
        controller = new LoanController();
        expect(controller).to.exist;

        console.log('    [Tests]'.gray);
        done();
      });
    });
  });

  beforeEach(function (done) { 
    mockgoose.helper.reset().then(() => {
      // Load mock item
      mockItem1 = new Item(mockItems[0]);
      mockItem1.save((error) => {
        expect(error).to.not.exist;
        // Load mock user
        mockUser1 = new User(mockUsers[0]);
        mockUser1.save((error) => {
          // Load mock loan
          mockLoan1 = new controller.Model(mockLoans[0]);
          mockLoan1.save((error) => {
            expect(error).to.not.exist;
            done();
          });
        });
      });
    });
  });

  after(function (done) {
    console.log('\n    [After]'.gray);
    console.log('    * Closing mongoose connection'.gray);
    mongoose.disconnect();
    done();
  });

  it('update', function () {
    // Valid case, return 1 item from loan
    const validReturn = new Promise((resolve) => {
      const req = { params: { Loan: mockLoan1._id }, body: { items: [ { _id: mockLoan1.items[1]._id, return_date: new Date() } ] }, Loan: mockLoan1 };
      const res = new MockResponse((value) => {
        expect(value.error).to.not.exist;
        expect(value.items[1].return_date).to.exist;
        resolve();
      }, (value) => {
        expect(value).to.equal(200);
      });

      controller.update(req, res);
    });

    // Invalid case, return 1 item that is not in the loan
    const invalidReturnMissingId = new Promise((resolve) => {
      const req = { params: { Loan: mockLoan1._id}, body: { items: [ { _id: mockUser1._id, return_date: new Date() } ] }, Loan: mockLoan1 };
      const res = new MockResponse((value) => {
        expect(value.error).to.exist;
        resolve();
      }, (value) => {
        expect(value).to.equal(400);
      });

      controller.update(req, res);
    });

    // Invalid case, attempt to update with invalid loan_date
    const invalidUpdate = new Promise((resolve) => {
      const req = { params: { Loan: mockLoan1._id }, body: { loan_date: 'fake_date' }, Loan: mockLoan1 };
      const res = new MockResponse((value) => {
        expect(value.error).to.exist;
        resolve();
      }, (value) => {
        expect(value).to.equal(400);
      });

      controller.update(req, res);
    });

    // Chain and test all promises 
    return validReturn.then(invalidReturnMissingId).then(invalidUpdate);
  });
  
  it('_handleItemsInUpdate', function () {
    // Handle single valid item
    const validSingleItem = new Promise((resolve) => {
      const req = {
        params: { Loan: mockLoan1._id },
        body: { items: [ { _id: mockLoan1.items[0]._id, return_date: new Date() }, ] },
        Loan: mockLoan1
      }

      LoanController._handleItemsInUpdate(req, (err) => {
        expect(err).to.not.exist;
        expect(req.body.items).to.not.exist; // should be dereferenced by _handleItemsInUpdate
        expect(mockLoan1.items[0].return_date).to.exist;
        resolve();
      });
    });
  
    // Handle multiple valid items
    const validMultipleItems = new Promise((resolve) => {
      const req = {
        params: { Loan: mockLoan1._id },
        body: { items: [ { _id: mockLoan1.items[1]._id, return_date: new Date() }, 
                         { _id: mockLoan1.items[2]._id, return_date: new Date() }, ] },
        Loan: mockLoan1
      }

      LoanController._handleItemsInUpdate(req, (err) => {
        expect(err).to.not.exist;
        expect(req.body.items).to.not.exist; // should be dereferenced by _handleItemsInUpdate
        expect(mockLoan1.items[1].return_date).to.exist;
        expect(mockLoan1.items[2].return_date).to.exist;
        resolve();
      });
    });
 
    // Handle invalid item
    const invalidItem = new Promise((resolve) => {
      const req = {
        params: { Loan: mockLoan1._id },
        body: { items: [ { return_date: new Date() }, ] },
        Loan: mockLoan1
      }

      LoanController._handleItemsInUpdate(req, (err) => {
        expect(err).to.exist;
        resolve();
      });
    });

    // Chain and test all promises
    return validSingleItem.then(validMultipleItems).then(invalidItem);
  });

  it('findUsersLoans', function () {
    // Get loans of existing user, should return 1
    const validUserWithLoans = new Promise((resolve) => {
      const req = { user: { sub: mockUser1._id.toString() } };
      const res = new MockResponse((value) => {
        expect(value).to.exist;
        expect(value.error).to.not.exist;
        
        // Check loan fields
        expect(value).to.not.be.empty;
        expect(value[0]._id).to.exist;
        expect(value[0].loaner).to.exist;
        expect(value[0].__v).to.exist;
        expect(value[0].items).to.exist;

        // Check items
        expect(value[0].items).to.not.be.empty;
        for (let i = 0; i < 3; i += 1) {
          expect(value[0].items[i]._id.toString()).to.equal(mockLoan1.items[i]._id.toString());
          expect(value[0].items[i].item.toString()).to.equal(mockLoan1.items[i].item.toString());
          expect(value[0].items[i].return_date).to.not.exist;
        }

        resolve();
      }, (value) => {
        expect(value).to.not.be.oneOf([500]);
      });

      controller.findUsersLoans(req, res);
    });
  
    // Get loans for invalid user, should return status 500 
    const invalidUser = new Promise((resolve) => {
      const req = { user: { sub: 42 } };
      const res = new MockResponse((value) => {
        expect(value.error).to.exist;
        resolve();
      }, (value) => {
        expect(value).to.equal(500);
      });

      controller.findUsersLoans(req, res);
    });

    // Chain and test all promises 
    return validUserWithLoans.then(invalidUser);
  });
});
