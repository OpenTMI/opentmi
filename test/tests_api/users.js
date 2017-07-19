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
      .end(function (pError, pRes) {
        expect(pError).to.equal(null);
        expect(pRes).to.be.a('Object');
        if (pRes.status === 300) {
          logger.warn('Seems that your DB is not clean!');
          process.exit(1);
        }
        expect(pRes).to.have.property('status', 200);

        expect(pRes.body).to.have.property('_id');
        newUserId = pRes.body._id;

        expect(pRes.body.name).to.eql(body.name);
        expect(pRes.body.email).to.eql(body.email);
        expect(pRes.body.displayName).to.eql(body.displayName);
        expect(pRes.body).to.have.ownProperty('apikeys');
        expect(pRes.body).to.have.ownProperty('groups');
        expect(pRes.body).to.have.ownProperty('loggedIn');
        expect(pRes.body).to.have.ownProperty('lastVisited');
        expect(pRes.body).to.have.ownProperty('registered');
        done();
      });
  });

  it('should return a SINGLE user on /users/<id> GET', function (done) {
    superagent.get(`${api}/users/${newUserId}`)
      .set('authorization', authString)
      .type('json')
      .end(function (pError, pRes) {
        expect(pError).to.equal(null);
        expect(pRes).to.be.a('Object');
        if (pRes.status === 300) {
          logger.warn('Seems that your DB is not clean!');
          process.exit(1);
        }
        expect(pRes.status).to.equal(200);

        // TODO: take properties straight from model
        expect(pRes.body).to.have.property('_id');
        expect(pRes.body.name).to.eql('Test User');
        expect(pRes.body.email).to.eql('testuser@fakemail.se');
        expect(pRes.body.displayName).to.eql('Tester');
        expect(pRes.body).to.have.property('apikeys');
        expect(pRes.body).to.have.property('groups');
        expect(pRes.body).to.have.property('loggedIn');
        expect(pRes.body).to.have.property('lastVisited');
        expect(pRes.body).to.have.property('registered');
        done();
      });
  });

  it('should update a SINGLE user on /users/<id> PUT', function (done) {
    const body = {email: 'newtestermail@fakemail.se'};

    superagent.put(`${api}/users/${newUserId}`)
      .set('authorization', authString)
      .send(body)
      .end(function (pError, pRes) {
        expect(pRes).to.be.a('Object');
        if (pRes.status === 300) {
          logger.warn('Seems that your DB is not clean!');
          process.exit(1);
        }
        expect(pRes.status).to.equal(200);
        expect(pError).to.equal(null);

        superagent.get(`${api}/users/${newUserId}`)
          .set('authorization', authString)
          .type('json')
          .end(function (pCheckError, pCheckRes) {
            expect(pCheckError).to.equal(null);
            expect(pCheckRes).to.be.a('Object');
            if (pCheckRes.status === 300) {
              logger.warn('Seems that your DB is not clean!');
              process.exit(1);
            }

            expect(pCheckRes.body).to.have.property('_id');
            expect(pCheckRes.body.name).to.eql('Test User');
            expect(pCheckRes.body.email).to.eql('newtestermail@fakemail.se');
            expect(pCheckRes.body.displayName).to.eql('Tester');
            expect(pCheckRes.body).to.have.property('apikeys');
            expect(pCheckRes.body).to.have.property('groups');
            expect(pCheckRes.body).to.have.property('loggedIn');
            expect(pCheckRes.body).to.have.property('lastVisited');
            expect(pCheckRes.body).to.have.property('registered');
            done();
          });
      });
  });

  it('should not delete a user that is referenced in a loan', function (done) {
    superagent.del(`${api}/users/${userWithLoanId}`)
      .set('authorization', authString)
      .end(function (pError, pRes) {
        expect(pRes).to.be.a('Object');
        expect(pError).to.not.equal(null);
        expect(pRes.status).to.equal(400);
        done();
      });
  });

  it('should delete a SINGLE user on /users/<id> DELETE', function (done) {
    superagent.del(`${api}/users/${newUserId}`)
      .set('authorization', authString)
      .end(function (pError, pRes) {
        expect(pError).to.equal(null);
        expect(pRes).to.be.a('Object');
        if (pRes.status === 300) {
          logger.warn('Seems that your DB is not clean!');
          process.exit(1);
        }
        expect(pRes.status).to.equal(200);

        // Make sure the document is deleted
        superagent.get(`${api}/users/${newUserId}`)
          .set('authorization', authString)
          .end(function (pCheckError, pCheckRes) {
            expect(pCheckRes).to.be.a('Object');
            expect(pCheckError).to.not.equal(null);
            expect(pCheckRes.status).to.equal(404);
            done();
          });
      });
  });
});
