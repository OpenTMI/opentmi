/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const jwtSimple = require('jwt-simple');
const moment = require('moment');
const superagent = require('superagent');
const chai = require('chai');
const logger = require('winston');

// Local components
const nconf = require('../../app/tools/config');

// Setup
logger.level = 'error';

// Test variables
const expect = chai.expect;
const api = 'http://localhost:3000/api/v0';
const testUserId = '5825bb7afe7545132c88c761';
const errorBody = {error: undefined};
let authString;

// Data
const itemIdLoaned = '582c7948850f298a5acff981';
let newItemId;
const validPostBody = {
  barcode: '9876543210',
  name: 'test item',
  text_description: 'This is a test item.',
  external_reference: 'https://suprtickets.com/blog/wp-content/uploads/2015/11/Rick-Astley-UK-Tour-Dates-2016.jpg',
  in_stock: 30,
  available: 25,
  date_created: new Date('2016-11-12T17:11:28+02:00'), // Cloned objects will refer to the same date, be careful
  category: 'component'
};

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

// Shortcut function for expecting a certain status with a certain body
function expectResult(res, targetStatus, targetBody) {
  if (!(targetBody instanceof Object) && targetBody !== undefined) {
    logger.error('[Test] Checks for non-object target bodies is not yet implemented');
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

describe('Items', function () {
  // Create fresh DB
  before(function (done) {
    this.timeout(5000);

    // Create token for requests
    const payload = {
      _id: testUserId,
      groups: ['123'],
      iat: moment().unix(),
      exp: moment().add(2, 'h').unix()
    };
    const token = jwtSimple.encode(payload, nconf.get('webtoken'));
    authString = `Bearer ${token}`;
    done();
  });

  it.skip('should return a list with a SINGLE item on /items?<name> GET', function (done) {
    const description =
    'Seeeduino Arch from Seeed Studio is an mbed enabled development board which combines some advantages '
    + 'of mbed and Arduino. Arch is based on NXP LPC11U24 with Arduino form factor and Grove connectors. '
    + 'Building a prototype is easy with lots of Shield and Grove modules.';

    const expectedBody = {
      _id: '582c7948850f298a5acff981',
      barcode: '012345678901',
      name: 'Seeeduino-Arch',
      image_src: 'https://developer.mbed.org/media/cache/platforms/Arch_V1.1.jpg.250x250_q85.jpg',
      text_description: description,
      external_reference: 'https://developer.mbed.org/platforms/Seeeduino-Arch/',
      in_stock: 20,
      available: 19,
      date_created: new Date('2016-11-12T17:11:28+02:00'),
      category: 'board'
    };

    superagent.get(`${api}/items?name=Seeeduino-Arch`)
      .set('authorization', authString)
      .type('json')
      .end(function (e, res) {
        expect(e).to.equal(null);
        expect(res.body).to.be.an('array');
        expect(res.body).to.have.lengthOf(1);
        res.body = res.body[0];
        expectResult(res, 200, expectedBody);
        done();
      });
  });

  it.skip('should return an image from /items/id/image', function (done) {
    this.timeout(5000);
    superagent.get(`${api}/items/582c7948850f298a5acff981/image`)
      .set('authorization', authString)
      .type('json')
      .end(function (e, res) {
        expect(e).to.equal(null);
        expect(res.status).to.equal(200);
        expect(res.get('Content-Type')).to.equal('image/jpeg');
        done();
      });
  });

  it('should not accept POST that has more available than in_stock', function (done) {
    const body = Object.assign({}, validPostBody);
    body.available = body.in_stock + 1;

    superagent.post(`${api}/items`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expect(e).to.not.equal(null);
        expectResult(res, 400, errorBody);
        done();
      });
  });

  it('should not accept POST that has negative available', function (done) {
    const body = Object.assign({}, validPostBody);
    body.available = -1;

    superagent.post(`${api}/items`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expect(e).to.not.equal(null);
        expectResult(res, 400, errorBody);
        done();
      });
  });

  it('should not accept POST that has negative available', function (done) {
    const body = Object.assign({}, validPostBody);
    body.in_stock = -1;

    superagent.post(`${api}/items`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expect(e).to.not.equal(null);
        expectResult(res, 400, errorBody);
        done();
      });
  });

  it('should not accept positive available without in_stock', function (done) {
    const body = Object.assign({}, validPostBody);
    delete body.in_stock;

    superagent.post(`${api}/items`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expect(e).to.not.equal(null);
        expectResult(res, 400, errorBody);
        done();
      });
  });

  // POST item and save _id because it is used for PUT and DELETE tests
  it('should add a SINGLE item on /items POST', function (done) {
    const body = Object.assign({}, validPostBody);

    superagent.post(`${api}/items`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, validPostBody);

        // Save id of this item for further testing purposes
        newItemId = res.body._id.toString();

        superagent.get(`${api}/items/${newItemId}`)
          .set('authorization', authString)
          .type('json')
          .end(function (checkError) {
            expect(checkError).to.equal(null);
            done();
          });
      });
  });

  it('should not accept post that has a barcode that is already in the database', function (done) {
    const body = Object.assign({}, validPostBody);
    body.barcode = '9876543210';

    superagent.post(`${api}/items`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expect(e).to.not.equal(null);
        expectResult(res, 400, {error: undefined});
        done();
      });
  });

  it('should not accept PUT with a negative available', function (done) {
    const body = {available: -1};

    superagent.put(`${api}/items/${newItemId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expect(e).to.not.equal(null);
        expectResult(res, 400, errorBody);
        done();
      });
  });

  it('should not accept PUT with a negative in_stock', function (done) {
    const body = {in_stock: -1};

    superagent.put(`${api}/items/${newItemId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expect(e).to.not.equal(null);
        expectResult(res, 400, errorBody);
        done();
      });
  });

  it('should not accept PUT with an in_stock that would cause available to be negative', function (done) {
    const body = {in_stock: 0};

    superagent.put(`${api}/items/${newItemId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (e, res) {
        expect(e).to.not.equal(null);
        expectResult(res, 400, errorBody);
        done();
      });
  });

  it('should update a SINGLE item on /items/<id> PUT, with just available field', function (done) {
    const body = {available: 10};
    const expectedBody = Object.assign({}, validPostBody);
    expectedBody.in_stock = 15;
    expectedBody.available = 10;

    superagent.put(`${api}/items/${newItemId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, undefined);

        // Check up call to make sure changes occured
        superagent.get(`${api}/items/${newItemId}`)
          .set('authorization', authString)
          .type('json')
          .end(function (checkError, checkRes) {
            expect(checkError).to.equal(null);
            expectResult(checkRes, 200, expectedBody);
            done();
          });
      });
  });

  it('should update a SINGLE item on /items/<id> PUT, with just in_stock field', function (done) {
    const body = {in_stock: 20};
    const expectedBody = Object.assign({}, validPostBody);
    expectedBody.in_stock = 20;
    expectedBody.available = 15;

    superagent.put(`${api}/items/${newItemId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, undefined);

        // Make sure item is really updated
        superagent.get(`${api}/items/${newItemId}`)
          .set('authorization', authString)
          .type('json')
          .end(function (checkError, checkRes) {
            expect(checkError).to.equal(null);
            expectResult(checkRes, 200, expectedBody);
            done();
          });
      });
  });

  it('should update a SINGLE item on /items/<id> PUT, with both in_stock and available', function (done) {
    const body = {
      available: 20,
      in_stock: 20
    };
    const expectedBody = Object.assign({}, validPostBody);
    expectedBody.in_stock = 20;
    expectedBody.available = 20;

    superagent.put(`${api}/items/${newItemId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, undefined);

        // Make sure item is really updated
        superagent.get(`${api}/items/${newItemId}`)
          .set('authorization', authString)
          .type('json')
          .end(function (checkError, checkRes) {
            expect(checkError).to.equal(null);
            expectResult(checkRes, 200, expectedBody);
            done();
          });
      });
  });

  it('should update all field values on a normal PUT', function (done) {
    const body = {
      barcode: '9876543991',
      name: 'real item',
      text_description: 'This was a test item.',
      external_reference: 'https://suprtickets.com/blog/wp-content/uploads/2015/11/Rick-Astley-UK-Tour-Dates-2015.jpg',
      in_stock: 15,
      available: 10,
      date_created: new Date('2012-11-12T17:11:28+02:00'),
      category: 'other'
    };

    superagent.put(`${api}/items/${newItemId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, undefined);

        // Check up call to make sure changes occured
        superagent.get(`${api}/items/${newItemId}`)
          .set('authorization', authString)
          .type('json')
          .end(function (checkError, checkRes) {
            expect(checkError).to.equal(null);
            expectResult(checkRes, 200, body);
            done();
          });
      });
  });

  it('should delete a SINGLE item on /items/<id> DELETE', function (done) {
    superagent.del(`${api}/items/${newItemId}`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expectResult(res, 200, undefined);

        // Make sure item is deleted
        superagent.get(`${api}/items/${newItemId}`)
          .set('authorization', authString)
          .end(function (checkError, checkRes) {
            expect(checkError).to.not.equal(null);
            expectResult(checkRes, 404, undefined);
            done();
          });
      });
  });

  it.skip('should not delete item that is loaned somewhere', function (done) {
    superagent.del(`${api}/items/${itemIdLoaned}`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(error).to.not.equal(null);
        expectResult(res, 400, undefined);
        done();
      });
  });
});
