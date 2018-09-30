/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const jwtSimple = require('jwt-simple');
const moment = require('moment');
const superagent = require('superagent');
const {expect} = require('chai');
const logger = require('winston');

const nconf = require('../../app/tools/config');

// Setup
logger.level = 'error';

// Test variables
const helpers = require('../tests_api/tools/helpers');
const api = helpers.apiV0;
const testUserId = helpers.testUserId;


describe('Basic cluster tests', function () {
  let authString;
  // Create fresh DB
  before(function () {
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
  });
  it('basic rest call works', function (done) {
    superagent.get(api)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        done();
      });
  });
  it('clusters api gives response', function (done) {
    // this request goes worker->master->worker->client
    superagent.get(`${api}/clusters`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.be.a('Object');
        // @todo fix for missing body is coing in another PR
        done();
      });
  });
});
