/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const jwtSimple = require('jwt-simple');
const moment = require('moment');
const superagent = require('superagent');
const chai = require('chai');
const logger = require('winston');
const _ = require('lodash');

const nconf = require('../../app/tools/config');

// Setup
logger.level = 'error';

// Test variables
const {expect} = chai;
const userWithLoanId = '5825bb7cfe7545132c88c773';
const host = 'http://localhost:3000';
const api = `${host}/api/v0`;
const testUserId = '5825bb7afe7545132c88c761';

// @todo all tests should be able to run individually
const statusCannotBe300 = (status) => {
  if (status === 300) {
    logger.warn('Seems that your DB is not clean!');
    process.exit(1);
  }
};

function encodeToken(payload = {}) {
  // Create token for requests
  const defaultPayload = {
    _id: testUserId,
    groups: ['123'],
    iat: moment().unix(),
    exp: moment().add(2, 'h').unix()
  };
  const data = _.defaults(payload, defaultPayload);
  return jwtSimple.encode(data, nconf.get('webtoken'));
}

const createHeaderFromToken = token => `Bearer ${token}`;
const createToken = user => createHeaderFromToken(encodeToken({_id: user._id}));

describe('Users', function () {
  let authString, adminAuthString, newUserId;

  // Create fresh DB
  before(function (done) {
    authString = createHeaderFromToken(encodeToken());
    adminAuthString = createHeaderFromToken(encodeToken({group: 'admins'}));
    done();
  });

  it('should add a SINGLE user on /users POST', function (done) {
    const body = {
      name: 'Test User',
      email: 'testuser@fakemail.se',
      password: 'topsecret',
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
  describe('/auth', function () {
    let createdUser;
    const createUser = (data = {}) => new Promise((resolve) => {
      const body = {
        name: '/auth_testuser',
        email: 'auth_testuser@fakemail.se',
        password: 'topsecret',
        displayName: 'Tester',
        apikeys: [],
        groups: []
      };
      _.merge(body, data);
      superagent.post(`${api}/users`)
        .set('authorization', authString)
        .send(body)
        .end(function (error, res) {
          expect(error).to.equal(null);
          expect(res).to.be.a('Object');
          expect(res).to.have.property('status', 200);
          expect(res.body.password).to.be.undefined;
          resolve(res.body);
        });
    });
    const removeUser = user => new Promise((resolve) => {
      const customAuthString = createToken(user);
      superagent.delete(`${api}/users/${user._id}`)
        .set('authorization', adminAuthString)
        .end(function (error, res) {
          expect(error).to.equal(null);
          expect(res).to.be.a('Object');
          expect(res).to.have.property('status', 200);
          resolve(res.body);
        });
    });

    afterEach('cleanup user', function () {
      if (createdUser) {
        const user = createdUser;
        createdUser = undefined;
        return removeUser(user);
      }
      return Promise.resolve();
    });

    it('should get user data on /auth/me', function () {
      return createUser()
        .then((user) => {
          createdUser = user;
          const customAuthString = createToken(user);
          return new Promise((resolve) => {
            superagent.get(`${host}/auth/me`)
              .set('authorization', customAuthString)
              .type('json')
              .end(function (error, res) {
                expect(error).to.equal(null);
                expect(res).to.be.a('Object');
                expect(res).to.have.property('status', 200);
                expect(res.body).to.be.a('Object');
                expect(res.body).to.have.property('_id');
                expect(res.body).to.have.property('name');
                expect(res.body).to.have.property('groups');
                resolve(res.body);
              });
          });
        });
    });

    it('should not get user data on /auth/me without token', function (done) {
      superagent.get(`${host}/auth/me`)
        .type('json')
        .end(function (error, res) {
          expect(res).to.be.a('Object');
          expect(res).to.have.property('status', 401);
          done();
        });
    });

    it('should update user data on PUT:/auth/me', function () {
      return createUser()
        .then((user) => {
          createdUser = user;
          const customAuthString = createToken(user);
          return new Promise((resolve) => {
            superagent.put(`${host}/auth/me`)
              .set('authorization', customAuthString)
              .type('json')
              .send({displayName: 'Tester'})
              .end(function (error, res) {
                expect(error).to.equal(null);
                expect(res).to.be.a('Object');
                expect(res).to.have.property('status', 200);
                resolve(user);
              });
          });
        });
    });
    it('should not allow to update user data on PUT:/auth/me without token', function (done) {
      superagent.put(`${host}/auth/me`)
        .type('json')
        .send({displayName: 'unknown'})
        .end(function (error, res) {
          expect(res).to.be.a('Object');
          expect(res).to.have.property('status', 401);
          done();
        });
    });

    it('should allow to login', function () {
      return createUser({password: 'topsecret'})
        .then(user => new Promise((resolve) => {
          createdUser = user;
          superagent.post(`${host}/auth/login`)
            .send({email: user.email, password: 'topsecret'})
            .type('json')
            .end(function (error, res) {
              expect(error).to.equal(null);
              expect(res).to.be.a('Object');
              expect(res).to.have.property('status', 200);
              expect(res.body).to.be.a('Object');
              expect(res.body).to.have.property('token');
              expect(res.body.token).to.be.a('string');
              resolve(user);
            });
        }));
    });
    it('should not allow to login without existing account', function () {
      return new Promise((resolve) => {
        superagent.post(`${host}/auth/login`)
          .send({email: 'not-exists@mail.com', password: 'unknown'})
          .type('json')
          .end(function (error, res) {
            expect(res).to.be.a('Object');
            expect(res).to.have.property('status', 401);
            resolve();
          });
      });
    });
    it('should allow to logout', function () {
      return createUser({password: 'topsecret'})
        .then((user) => {
          createdUser = user;
          const customAuthString = createToken(user);
          return new Promise((resolve) => {
            superagent.post(`${host}/auth/logout`)
              .set('authorization', customAuthString)
              .type('json')
              .end(function (error, res) {
                expect(error).to.equal(null);
                expect(res).to.be.a('Object');
                expect(res).to.have.property('status', 200);
                resolve(user);
              });
          });
        });
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

  it('should not delete a user that is referenced in a loan', function (done) {
    superagent.del(`${api}/users/${userWithLoanId}`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(res).to.be.a('Object');
        expect(error).to.not.equal(null);
        expect(res.status).to.equal(400);
        done();
      });
  });

  it('should default unknown settings to empty object /users/<id>/settings/notexists GET', function (done) {
    superagent.get(`${api}/users/${newUserId}/settings/notexists`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(res).to.be.a('Object');
        expect(error).to.equal(null);
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.equal({});
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
        // Make sure the setting is deleted
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

  it('should allow to delete known settings /users/<id>/settings/test DELETE', function (done) {
    superagent.delete(`${api}/users/${newUserId}/settings/test`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(error).to.equal(null);
        statusCannotBe300(res.status);
        expect(res.status).to.equal(200);
        // Make sure the setting is deleted
        superagent.get(`${api}/users/${newUserId}/settings/test`)
          .set('authorization', authString)
          .end(function (checkError, checkRes) {
            expect(checkRes).to.be.a('Object');
            expect(checkRes.status).to.equal(200);
            expect(checkError).to.equal(null);
            expect(checkRes.body).to.deep.equal({});
            done();
          });
      });
  });
  it('should not allow to delete unknown settings /users/<id>/settings/unknown DELETE', function (done) {
    superagent.delete(`${api}/users/${newUserId}/settings/unknown`)
      .set('authorization', authString)
      .end(function (error, res) {
        expect(error).to.not.equal(null);
        statusCannotBe300(res.status);
        expect(res.status).to.equal(404);
        expect(res.body).to.be.a('Object');
        done();
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
