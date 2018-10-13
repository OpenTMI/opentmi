/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const logger = require('winston');

// Local components
const config = require('../../app/tools/config');
const {createUserToken, testUserId} = require('./tools/helpers');

// Setup
logger.level = 'error';

// Test variables
let authString; // eslint-disable-line no-unused-vars

describe('Builds', function () {
  // Create fresh DB
  before(function () {
    this.timeout(5000);

    const tokenInput = {
      userId: testUserId,
      group: 'admins',
      webtoken: config.get('webtoken')
    };
    authString = createUserToken(tokenInput).authString;
  });
});
