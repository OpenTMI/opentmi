/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const jwtSimple = require('jwt-simple');
const moment = require('moment');
const superagent = require('superagent');
const chai = require('chai');
const logger = require('winston');

const nconf = require('../../app/tools/config');

// Setup
logger.level = 'error';

// Test variables
const {expect} = chai;
const api = 'http://localhost:3000/api/v0';
const testUserId = '5825bb7afe7545132c88c761';
let authString;

describe('Basic Get API', function () {
  // Create fresh DB
  before(function () {
    // Create token for requests
    const payload = {
      _id: testUserId,
      group: 'admins',
      groups: ['admins'],
      iat: moment().unix(),
      exp: moment().add(1, 'days').unix()
    };
    const token = jwtSimple.encode(payload, nconf.get('webtoken'));
    authString = `Bearer ${token}`;
  });

  it('get api version', function (done) {
    superagent.get(api)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.deep.equal({apiVersion: 'v0'});
        expect(res.body).to.not.be.empty;
        done();
      });
  });
  it('get server version', function (done) {
    superagent.get(`${api}/version`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.have.a('Object');
        expect(res.body).to.not.be.empty;
        expect(res.body.commitId).to.have.a('string');
        expect(res.body.OpenTMI).to.have.a('string');
        expect(res.body.dependencies).to.not.exist;
        done();
      });
  });
  it('get server version deep', function (done) {
    this.timeout(10000);
    superagent.get(`${api}/version?deep=true`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.have.a('Object');
        expect(res.body.commitId).to.have.a('string');
        expect(res.body.dependencies).to.have.a('Object');
        done();
      });
  });

  it('get testcases', function (done) {
    superagent.get(`${api}/testcases`)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.be.instanceof(Array);
        done();
      });
  });

  it('get campaigns', function (done) {
    superagent.get(`${api}/campaigns`)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.be.instanceof(Array);
        done();
      });
  });

  it('get resources', function (done) {
    superagent.get(`${api}/resources`)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.be.instanceof(Array);
        done();
      });
  });

  it('get results', function (done) {
    superagent.get(`${api}/results`)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.be.instanceof(Array);
        done();
      });
  });

  it('get builds', function (done) {
    superagent.get(`${api}/duts/builds`)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.be.instanceof(Array);
        done();
      });
  });

  it('get users', function (done) {
    superagent.get(`${api}/users`)
      .set('authorization', authString)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.be.instanceof(Array);
        expect(res.body).not.to.be.empty;
        done();
      });
  });

  it('get items', function (done) {
    superagent.get(`${api}/items`)
      .set('authorization', authString)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.be.instanceof(Array);
        done();
      });
  });

  it('get loans', function (done) {
    superagent.get(`${api}/loans`)
      .set('authorization', authString)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.be.instanceof(Array);
        done();
      });
  });
});
