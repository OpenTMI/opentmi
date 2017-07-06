const jwt_s = require('jwt-simple');
const nconf = require('nconf');
const moment = require('moment');

const superagent = require('superagent');
const should = require('should');
const chai = require('chai');
const expect = chai.expect;

const api = 'http://localhost:3000/api/v0';
const mongodbUri = 'mongodb://localhost/opentmi_dev';
const test_user_id = '5825bb7afe7545132c88c761';

const authString = '';

const logger = require('winston');
logger.level = 'error';

describe('Builds', function () {
  // Create fresh DB
  before(function (done) {
    this.timeout(5000);

    // Create token for requests
    const payload = {
      sub: test_user_id,
      group: 'admins',
      iat: moment().unix(),
      exp: moment().add(2, 'h').unix(),
    };
    const token = jwt_s.encode(payload, nconf.get('webtoken'));
    authString = `Bearer ${token}`;
    done();
  });
});