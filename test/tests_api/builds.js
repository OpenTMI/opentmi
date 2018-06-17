/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const logger = require('winston');

// Local components
const config = require('../../config');
const {createUserToken} = require('./tools/helpers');

// Setup
logger.level = 'error';

// Test variables
// const expect = chai.expect;
// const api = 'http://localhost:3000/api/v0';
const testUserId = '5825bb7afe7545132c88c761';
let authString; // eslint-disable-line no-unused-vars

describe('Builds', function () {
  // Create fresh DB
  before(function () {
    this.timeout(5000);

    const tokenInput = {
      userId: testUserId,
      group: 'admins',
      groupId: '123',
      webtoken: config.get('webtoken')
    };
    authString = createUserToken(tokenInput).authString;
  });
});
