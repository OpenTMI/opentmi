/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
require('colors');
const chai = require('chai');
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const mongoose = require('mongoose');
const Mockgoose = require('mockgoose').Mockgoose;
const logger = require('winston');
const Promise = require('bluebird');

// Local components
require('./../../app/models/group.js');
require('./../../app/models/user.js');
require('./../../app/models/item.js');
require('./../../app/models/loan.js');
const LoanController = require('./../../app/controllers/loans.js');

// Setup
logger.level = 'error';
mongoose.Promise = Promise;
chai.use(chaiSubset);
chai.use(chaiAsPromised);

// Mocking
const mockItems = require('./mocking/MockItems.js');
const mockUsers = require('./mocking/MockUsers.js');
const mockLoans = require('./mocking/MockLoans.js');
const MockResponse = require('./mocking/MockResponse.js');

let mockItem1 = null;
let mockUser1 = null;
let mockLoan1 = null;

// Test variables
const mockgoose = new Mockgoose(mongoose);
const expect = chai.expect;
let controller = null;

const User = mongoose.model('User');
const Item = mongoose.model('Item');

describe.skip('controllers/loans.js', function () {
  // Create fresh DB
  before(function () {
    mockgoose.helper.setDbVersion('3.2.1');

    logger.debug('[Before] Preparing storage'.gray);
    return mockgoose.prepareStorage().then(() => {
      logger.debug('[Before] Connecting to mongo\n'.gray);
      return mongoose.connect('mongodb://testmock.com/TestingDB').then(() => {
        // Create controller to test
        controller = new LoanController();
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
        mockLoan1.save()
      ]);
    });
  });

  after(function (done) {
    logger.debug('[After] Closing mongoose connection'.gray);
    mongoose.disconnect();
    done();
  });

  it('update', function () {
    // Valid case, return 1 item from loan
    const validReturn = new Promise((resolve) => {
      const body = {
        items: [
          {_id: mockLoan1.items[1]._id, return_date: new Date()}
        ]
      };
      const req = {
        body,
        Loan: mockLoan1,
        params: {Loan: mockLoan1._id}
      };
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
      const body = {
        items: [
          {_id: mockUser1._id, return_date: new Date()}
        ]
      };
      const Loan = mockLoan1;
      const params = {Loan: mockLoan1._id};

      const req = {body, Loan, params};
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
      const body = {loan_date: 'fake_date'};
      const Loan = mockLoan1;
      const params = {Loan: mockLoan1._id};

      const req = {body, Loan, params};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(400);
      });

      controller.update(req, res);
    });

    // Chain and test all promises
    return validReturn.then(() => invalidReturnMissingId).then(() => invalidUpdate);
  });

  it('_handleItemsInUpdate', function () {
    // Handle single valid item
    const validSingleItem = new Promise((resolve) => {
      const body = {
        items: [
          {_id: mockLoan1.items[0]._id, return_date: new Date()}
        ]
      };
      const Loan = mockLoan1;
      const params = {Loan: mockLoan1._id};

      const req = {body, Loan, params};
      LoanController._handleItemsInUpdate(req, (err) => {
        expect(err).to.not.exist;
        expect(req.body).to.not.have.property('items'); // should be dereferenced by _handleItemsInUpdate
        expect(mockLoan1.items[0]).to.have.property('return_date');
        resolve();
      });
    });

    // Handle multiple valid items
    const validMultipleItems = new Promise((resolve) => {
      const body = {
        items: [
          {_id: mockLoan1.items[1]._id, return_date: new Date()},
          {_id: mockLoan1.items[2]._id, return_date: new Date()}
        ]
      };
      const Loan = mockLoan1;
      const params = {Loan: mockLoan1._id};

      const req = {body, Loan, params};
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
      const body = {
        items: [
          {return_date: new Date()}
        ]
      };
      const Loan = mockLoan1;
      const params = {Loan: mockLoan1._id};

      const req = {body, Loan, params};
      LoanController._handleItemsInUpdate(req, (err) => {
        expect(err).to.exist;
        resolve();
      });
    });

    // Chain and test all promises
    return validSingleItem.then(() => validMultipleItems).then(() => invalidItem);
  });

  it('findUsersLoans', function () {
    // Get loans of existing user, should return 1
    const validUserWithLoans = new Promise((resolve) => {
      const req = {user: {_id: mockUser1._id.toString()}};
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
          expect(objDoc.items[i].item._id.toString()).to.equal(mockLoan1.items[i].item.toString());
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
      const req = {user: {_id: 42}};
      const res = new MockResponse((value) => {
        expect(value).to.have.property('error');
        resolve();
      }, (value) => {
        expect(value).to.equal(500);
      });

      controller.findUsersLoans(req, res);
    });

    // Chain and test all promises
    return validUserWithLoans.then(() => invalidUser);
  });
});
