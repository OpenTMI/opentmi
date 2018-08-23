/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components

const superagent = require('superagent');
const chai = require('chai');
const logger = require('winston');

// Local components
const config = require('../../app/tools/config');
const {createUserToken, apiV0} = require('./tools/helpers');


// Setup
logger.level = 'error';

// Test variables
const expect = chai.expect;
const api = apiV0;
const testUserId = '5825bb7afe7545132c88c761';
const testItemId = '582c7948850f298a5acff991';
const errorBody = {error: undefined};

const validLoanId = '582d81d64306a86032e6bea1';
const validLoanBody = {
  loan_date: new Date(),
  loaner: '5825bb7cfe7545132c88c777',
  items: [
    {item: testItemId},
    {item: testItemId},
    {item: testItemId}
  ]
};

let authString;
let testLoanId;

function cloneObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Wrap around for testing equality of two values, includes support for dates
function expectObjectsToEqual(bodyA, bodyB) {
  Object.keys(bodyB).forEach((key) => {
    expect(bodyA).to.have.property(key);

    if (bodyB[key] instanceof Date) {
      const parsedFirstTime = (new Date(bodyA[key])).getTime();
      const parsedSecondTime = (new Date(bodyB[key])).getTime();
      expect(parsedFirstTime).to.equal(parsedSecondTime);
    } else if (bodyB[key] !== undefined) {
      expect(bodyA[key]).to.equal(bodyB[key]);
    }
  });
}

// Short cut for expect a certain status with a certain body
function expectResult(res, targetStatus, targetBody) {
  if (!(targetBody instanceof Object) && targetBody !== undefined) {
    logger.error('[Test] checks for non-object target bodies is not yet implemented');
    process.exit(1);
  }

  expect(res).to.be.a('Object');

  if (res.status === 300) {
    logger.error('[Test] 300 multiple choices points to an unclean DB');
    process.exit(1);
  }

  expect(res.status).to.equal(targetStatus);

  if (targetBody !== undefined) {
    expect(res.body).to.be.instanceof(Object);
    expectObjectsToEqual(JSON.parse(JSON.stringify(res.body)), targetBody);
  }
}

describe('Loans', function () {
  // Create fresh DB
  before(function () {
    const tokenInput = {
      userId: testUserId,
      group: 'admins',
      groupId: '123',
      webtoken: config.get('webtoken')
    };
    authString = createUserToken(tokenInput).authString;
  });

  it.skip('should return a SINGLE loan on /loans/<id> GET', function (done) {
    const expectedBody = {
      _id: '582d81d64306a86032e6bea1',
      loan_date: new Date('2016-11-14T13:37:00+02:00'),
      loaner: '5825bb7cfe7545132c88c773',
      items: undefined
    };

    superagent.get(`${api}/loans/${validLoanId}`)
      .set('authorization', authString)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, expectedBody);

        // items is a complex structure and needs to be validated separately
        expect(res.body.items).to.be.an('array');
        expect(res.body.items[0]).to.have.property('_id');
        expect(res.body.items[0]).to.have.property('item');

        done();
      });
  });

  it('should not accept POST without items array', function (done) {
    const body = cloneObject(validLoanBody);
    delete body.items;

    superagent.post(`${api}/loans`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expectResult(res, 400, errorBody);
        done();
      });
  });

  it('should not accept POST with an empty items array', function (done) {
    const body = cloneObject(validLoanBody);
    body.items = [];

    superagent.post(`${api}/loans`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expectResult(res, 400, errorBody);
        done();
      });
  });

  it('should not accept POST with item that does not have an item field', function (done) {
    const body = cloneObject(validLoanBody);
    delete body.items[0].item;

    superagent.post(`${api}/loans`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expectResult(res, 400, errorBody);
        done();
      });
  });

  it('should not accept POST with item that has an invalid item field', function (done) {
    const body = cloneObject(validLoanBody);
    body.items[0].item = 'invalid_field';

    superagent.post(`${api}/loans`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expectResult(res, 400, errorBody);
        done();
      });
  });

  it.skip('should accept and remove predefined return dates from a POST', function (done) {
    const body = cloneObject(validLoanBody);
    body.items[0].return_date = new Date();

    superagent.post(`${api}/loans`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expectResult(res, 200, undefined);

        // Make sure the item indeed was not returned
        superagent.get(`${api}/loans/${res.body._id}`)
          .set('authorization', authString)
          .type('json')
          .end(function (checkError, checkRes) {
            expect(checkError).to.equal(null);
            expect(checkRes.status).to.equal(200);
            expect(checkRes.body.items[0]).to.not.have.property('return_date');
            done();
          });
      });
  });

  it.skip('should add a SINGLE loan on /loans POST', function (done) {
    const body = validLoanBody;
    const expectedBody = cloneObject(validLoanBody);
    expectedBody.items = undefined; // arrays cannot be compared automatically

    superagent.post(`${api}/loans`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, expectedBody);

        // Save _id for later use
        testLoanId = res.body._id;

        // Make sure the loan is created
        superagent.get(`${api}/loans/${testLoanId}`)
          .set('authorization', authString)
          .type('json')
          .end(function (checkError, checkRes) {
            expect(checkError).to.equal(null);
            expectResult(checkRes, 200, expectedBody);

            // Validate created items
            validLoanBody.items[0]._id = checkRes.body.items[0]._id;
            validLoanBody.items[1]._id = checkRes.body.items[1]._id;
            validLoanBody.items[2]._id = checkRes.body.items[2]._id;

            done();
          });
      });
  });

  it.skip('should decrease item availability on POST', function (done) {
    const expectedBody = {available: 4};
    superagent.get(`${api}/items/${testItemId}`)
      .set('authorization', authString)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);

        // Should decrease 6 from what is in the seeds(after 2 successful loans of 3)
        expectResult(res, 200, expectedBody);
        done();
      });
  });

  it.skip('should not accept item without _id field when adding return_date to item on PUT', function (done) {
    const body = {items: cloneObject(validLoanBody.items)};
    delete body.items[0]._id;
    body.items.pop();

    superagent.put(`${api}/loans/${testLoanId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.not.equal(null);
        expectResult(res, 400, undefined);
        done();
      });
  });

  it.skip('should not accept return PUT with invalid return_date', function (done) {
    const body = {items: cloneObject(validLoanBody.items)};
    body.items[0].return_date = 'invalid date';

    superagent.put(`${api}/loans/${testLoanId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expect(e).to.not.equal(null);
        expectResult(res, 400, undefined);
        done();
      });
  });

  it.skip('should accept return PUT with valid return_date', function (done) {
    const testDate = new Date();
    const body = {items: cloneObject(validLoanBody.items)};
    body.items[1].return_date = testDate;

    const expectedBody = cloneObject(validLoanBody);
    expectedBody.items = undefined;

    superagent.put(`${api}/loans/${testLoanId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, expectedBody);
        done();
      });
  });

  it.skip('should update a SINGLE item on /loans/<id> PUT', function (done) {
    const testDate = new Date();
    const body = {loan_date: testDate};

    const expectedBody = cloneObject(validLoanBody);
    expectedBody.items = undefined;
    expectedBody.loan_date = testDate;

    const loanRoute = `${api}/loans/${testLoanId}`;
    superagent.put(loanRoute)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, undefined);

        superagent.get(loanRoute)
          .set('authorization', authString)
          .type('json')
          .end(function (checkError, checkRes) {
            expect(checkError).to.equal(null);
            expectResult(checkRes, 200, expectedBody);
            done();
          });
      });
  });

  it.skip('should increase item availability on PUT', function (done) { // Should be after the relevant put
    const expectedBody = {available: 5};

    superagent.get(`${api}/items/${testItemId}`)
      .set('authorization', authString)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, expectedBody); // Should increase 1 from last loan
        done();
      });
  });

  // Should be the second last test for loans
  it.skip('should delete a SINGLE loan on /loans/<id> DELETE', function (done) {
    const loanRoute = `${api}/loans/${testLoanId}`;
    superagent.del(loanRoute)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, undefined);

        // Make sure loan is deleted
        superagent.get(loanRoute)
          .set('authorization', authString)
          .type('json')
          .end(function (checkError, checkRes) {
            expect(checkError).to.not.equal(null);
            expectResult(checkRes, 404, undefined);
            done();
          });
      });
  });

  // Make sure items availability changed on delete
  it.skip('should increase availablity on deleted item for all unreturned items', function (done) {
    const expectedBody = {available: 7};

    superagent.get(`${api}/items/${testItemId}`)
      .set('authorization', authString)
      .end(function (e, res) {
        expect(e).to.equal(null);
        expectResult(res, 200, expectedBody);
        done();
      });
  });
});
