/* global describe before beforeEach after it */
/* eslint-disable */
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

require('./../../app/models/group.js');
require('./../../app/models/user.js');
require('./../../app/models/item.js')
require('./../../app/models/loan.js')

const logger = require('winston');
logger.level = 'error';

// Local components
const LoanController = require('./../../app/controllers/loans.js');
let controller = null;

const User = mongoose.model('User');
const Item = mongoose.model('Item');

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
/* eslint-enable */


describe('controllers/loans.js', function () {
  // Create fresh DB
  before(function () {
    mockgoose.helper.setDbVersion('3.2.1');

    console.log('    [Before]'.gray);
    console.log('    * Preparing storage'.gray);
    return mockgoose.prepareStorage().then(() => {
      console.log('    * Connecting to mongo\n'.gray);
      return mongoose.connect('mongodb://testmock.com/TestingDB').then(() => {
        // Create controller to test
        controller = new LoanController();
        console.log('    [Tests]'.gray);
      });
    });
  });

  beforeEach(function () {
    return mockgoose.helper.reset().then(() => {
       // Load mock item
      mockItem1 = new Item(mockItems[0]);
      mockUser1 = new User(mockUsers[0]);
      mockLoan1 = new controller.Model(mockLoans[0]);
      return Promise.all([
        mockItem1.save(),
        mockUser1.save(),
        mockLoan1.save(),
      ]);
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
      const req = { params: { Loan: mockLoan1._id }, body: { items: [{ _id: mockLoan1.items[1]._id, return_date: new Date() }] }, Loan: mockLoan1 };
      const res = new MockResponse((value) => {
        expect(value).to.not.have.property('error');
        expect(value.items[1]).to.have.property('return_date');
        resolve();
      }, (value) => {
        expect(value).to.equal(200);
      });

      controller.update(req, res);
    });

    // Invalid case, return 1 item that is not in the loan
    const invalidReturnMissingId = new Promise((resolve) => {
      const req = { params: { Loan: mockLoan1._id }, body: { items: [{ _id: mockUser1._id, return_date: new Date() }] }, Loan: mockLoan1 };
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
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
        expect(value).to.have.property('error');
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
        body: { items: [{ _id: mockLoan1.items[0]._id, return_date: new Date() }] },
        Loan: mockLoan1,
      };

      LoanController._handleItemsInUpdate(req, (err) => {
        expect(err).to.not.exist;
        expect(req.body).to.not.have.property('items'); // should be dereferenced by _handleItemsInUpdate
        expect(mockLoan1.items[0]).to.have.property('return_date');
        resolve();
      });
    });

    // Handle multiple valid items
    const validMultipleItems = new Promise((resolve) => {
      const req = {
        params: { Loan: mockLoan1._id },
        body: { items: [{ _id: mockLoan1.items[1]._id, return_date: new Date() },
                        { _id: mockLoan1.items[2]._id, return_date: new Date() }] },
        Loan: mockLoan1,
      };

      LoanController._handleItemsInUpdate(req, (err) => {
        expect(err).to.not.exist;
        expect(req.body).to.not.have.property('items'); // should be dereferenced by _handleItemsInUpdate
        expect(mockLoan1.items[1]).to.have.property('return_date');
        expect(mockLoan1.items[2]).to.have.property('return_date');
        resolve();
      });
    });

    // Handle invalid item
    const invalidItem = new Promise((resolve) => {
      const req = {
        params: { Loan: mockLoan1._id },
        body: { items: [{ return_date: new Date() }] },
        Loan: mockLoan1,
      };

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
        expect(value).to.not.have.property('error');

        // Check loan fields
        const objDoc = value[0].toObject();
        expect(objDoc).to.have.property('_id');
        expect(objDoc).to.have.property('loaner');
        expect(objDoc).to.have.property('__v');
        expect(objDoc).to.have.property('items');

        // Check items
        expect(objDoc.items).to.not.be.empty;

        for (let i = 0; i < 3; i += 1) {
          expect(objDoc.items[i]._id.toString()).to.equal(mockLoan1.items[i]._id.toString());
          expect(objDoc.items[i].item.toString()).to.equal(mockLoan1.items[i].item.toString());
          expect(objDoc.items[i]).to.not.have.property('return_date');
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
        expect(value).to.have.property('error');
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
