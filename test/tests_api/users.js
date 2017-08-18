/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const jwtSimple = require('jwt-simple');
const nconf = require('../../config');
const moment = require('moment');
const superagent = require('superagent');
const chai = require('chai');
const logger = require('winston');

// Setup
logger.level = 'error';

// Test variables
const expect = chai.expect;
const userWithLoanId = '5825bb7cfe7545132c88c773';
const api = 'http://localhost:3000/api/v0';
const testUserId = '5825bb7afe7545132c88c761';
let authString;
let newUserId;

describe('Users', function () {

  const statusCannotBe300 = (status) => {
    if (status === 300) {
      logger.warn('Seems that your DB is not clean!');
      process.exit(1);
    }
  };

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

  it('should add a SINGLE user on /users POST', function (done) {
    const body = {
      name: 'Test User',
      email: 'testuser@fakemail.se',
      displayName: 'Tester',
      apikeys: [],
      groups: []
    };

    superagent.post(`${api}/users`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        statusCannotBe300(res.status);
        expect(res).to.have.property('status', 200);

        expect(res.body).to.have.property('_id');
        newUserId = res.body._id;

        expect(res.body.name).to.eql(body.name);
        expect(res.body.email).to.eql(body.email);
        expect(res.body.displayName).to.eql(body.displayName);
        expect(res.body).to.have.ownProperty('apikeys');
        expect(res.body).to.have.ownProperty('groups');
        expect(res.body).to.have.ownProperty('loggedIn');
        expect(res.body).to.have.ownProperty('lastVisited');
        expect(res.body).to.have.ownProperty('registered');
        done();
      });
  });

  it('should return a SINGLE user on /users/<id> GET', function (done) {
    superagent.get(`${api}/users/${newUserId}`)
      .set('authorization', authString)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        statusCannotBe300(res.status);
        expect(res.status).to.equal(200);

        // TODO: take properties straight from model
        expect(res.body).to.have.property('_id');
        expect(res.body.name).to.eql('Test User');
        expect(res.body.email).to.eql('testuser@fakemail.se');
        expect(res.body.displayName).to.eql('Tester');
        expect(res.body).to.have.property('apikeys');
        expect(res.body).to.have.property('groups');
        expect(res.body).to.have.property('loggedIn');
        expect(res.body).to.have.property('lastVisited');
        expect(res.body).to.have.property('registered');
        done();
      });
  });

  it('should update a SINGLE user on /users/<id> PUT', function (done) {
    const body = {email: 'newtestermail@fakemail.se'};

    superagent.put(`${api}/users/${newUserId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(res).to.be.a('Object');
        statusCannotBe300(res.status);
        expect(res.status).to.equal(200);
        expect(error).to.equal(null);

        superagent.get(`${api}/users/${newUserId}`)
          .set('authorization', authString)
          .type('json')
          .end(function (checkError, checkRes) {
            expect(checkError).to.equal(null);
            expect(checkRes).to.be.a('Object');
            if (checkRes.status === 300) {
              logger.warn('Seems that your DB is not clean!');
              process.exit(1);
            }

            expect(checkRes.body).to.have.property('_id');
            expect(checkRes.body.name).to.eql('Test User');
            expect(checkRes.body.email).to.eql('newtestermail@fakemail.se');
            expect(checkRes.body.displayName).to.eql('Tester');
            expect(checkRes.body).to.have.property('apikeys');
            expect(checkRes.body).to.have.property('groups');
            expect(checkRes.body).to.have.property('loggedIn');
            expect(checkRes.body).to.have.property('lastVisited');
            expect(checkRes.body).to.have.property('registered');
            done();
          });
      });
  });

  it.skip('should not delete a user that is referenced in a loan', function (done) {
    superagent.del(`${api}/users/${userWithLoanId}`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(res).to.be.a('Object');
        expect(error).to.not.equal(null);
        expect(res.status).to.equal(400);
        done();
      });
  });

  it('should not give unknown setting /users/<id>/settings/notexists GET', function (done) {
    superagent.get(`${api}/users/${newUserId}/settings/notexists`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(res).to.be.a('Object');
        expect(error).to.not.equal(null);
        expect(res.status).to.equal(404);
        done();
      });
  });

  it('should allow to store settings /users/<id>/settings/test PUT', function (done) {
    const body = {my: 'custom settings'};
    superagent.put(`${api}/users/${newUserId}/settings/test`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        statusCannotBe300(res.status);
        expect(res.status).to.equal(200);
        expect(res).to.be.a('Object');
        // Make sure the document is deleted
        superagent.get(`${api}/users/${newUserId}/settings/test`)
          .set('authorization', authString)
          .end(function (checkError, checkRes) {
            expect(res.status).to.equal(200);
            expect(checkRes).to.be.a('Object');
            expect(checkError).to.equal(null);
            expect(checkRes.body).to.be.deep.equal(body);
            done();
          });
      });
  });

  it('should allow to delete settings /users/<id>/settings/test DELETE', function (done) {
    const body = {my: 'custom settings'};
    superagent.delete(`${api}/users/${newUserId}/settings/test`)
      .set('authorization', authString)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        statusCannotBe300(res.status);
        expect(res.status).to.equal(200);
        // Make sure the document is deleted
        superagent.get(`${api}/users/${newUserId}/settings/test`)
          .set('authorization', authString)
          .end(function (checkError, checkRes) {
            expect(res.status).to.equal(404);
            expect(checkRes).to.be.a('Object');
            expect(checkError).to.equal(null);
            expect(checkRes.body).to.be.deep.equal(body);
            done();
          });
      });
  });

  it('should delete a SINGLE user on /users/<id> DELETE', function (done) {
    superagent.del(`${api}/users/${newUserId}`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        statusCannotBe300(res.status);
        expect(res.status).to.equal(200);

        // Make sure the document is deleted
        superagent.get(`${api}/users/${newUserId}`)
          .set('authorization', authString)
          .end(function (checkError, checkRes) {
            expect(checkRes).to.be.a('Object');
            expect(checkError).to.not.equal(null);
            expect(checkRes.status).to.equal(404);
            done();
          });
      });
  });
});
