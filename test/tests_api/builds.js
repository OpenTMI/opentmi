/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const jwtSimple = require('jwt-simple');
const moment = require('moment');
// const superagent = require('superagent');
// const chai = require('chai');
const logger = require('winston');

// Local components
const nconf = require('nconf');

// Setup
logger.level = 'error';

// Test variables
// const expect = chai.expect;
// const api = 'http://localhost:3000/api/v0';
const testUserId = '5825bb7afe7545132c88c761';
let authString; // eslint-disable-line no-unused-vars

describe('Builds', function () {
  // Create fresh DB
  before(function (done) {
    this.timeout(5000);

    // Create token for requests
    const payload = {
      sub: testUserId,
      group: 'admins',
      iat: moment().unix(),
      exp: moment().add(2, 'h').unix()
    };

    const token = jwtSimple.encode(payload, nconf.get('webtoken'));
    authString = `Bearer ${token}`;
    done();
  });
});
