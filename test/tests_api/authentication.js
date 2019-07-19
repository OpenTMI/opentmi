/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const Promise = require('bluebird');
const superagentPromise = require('superagent-promise');
const superagent = superagentPromise(require('superagent'), Promise);
const {expect} = require('chai');
const logger = require('winston');

// Setup
logger.level = 'error';
const {api, protocol, host, port, createUser, deleteUser} = require('./tools/helpers');


describe('authentication', function () {
  describe('Local', function () {
    const name = 'heppu';
    const email = 'heppu@opentmi.com';
    const password = 'uppeh';
    let userId;
    before('create tmp user', function () {
      return createUser({name, email, password})
        .then((user) => { userId = user._id; });
    });
    after('delete tmp user', function () {
      return userId ? deleteUser(userId) : true;
    });
    it('invalid username are rejected', function () {
      const payload = {
        email: 'invalid',
        password: 'invalid'
      };
      return superagent.post(`${api}/auth/login`, payload)
        .end()
        .reflect()
        .then((promise) => {
          const {response} = promise.reason();
          expect(promise.isRejected()).to.be.true;
          expect(response.status).to.be.equal(401);
        });
    });
    it('invalid password are rejected', function () {
      const payload = {
        email,
        password: 'invalid'
      };
      return superagent.post(`${api}/auth/login`, payload)
        .end()
        .reflect()
        .then((promise) => {
          const {response} = promise.reason();
          expect(promise.isRejected()).to.be.true;
          expect(response.status).to.be.equal(401);
        });
    });
    it('valid email with valid password returns access token', function () {
      const payload = {email, password};
      return superagent.post(`${api}/auth/login`, payload)
        .end()
        .then(res => res.body)
        .then((body) => {
          expect(body.token).to.be.an('string');
        });
    });
    it('valid name with valid password returns access token', function () {
      const payload = {email: name, password};
      return superagent.post(`${api}/auth/login`, payload)
        .end()
        .then(res => res.body)
        .then((body) => {
          expect(body.token).to.be.an('string');
        });
    });
    it('basic', function () {
      return superagent.get(`${protocol}://${name}:${password}@${host}:${port}/auth/me`)
        .end()
        .then(res => res.body)
        .then((body) => {
          expect(body._id).to.be.an('string');
          expect(body.__v).to.be.an('number');
          expect(body.loggedIn).to.be.an('boolean');
          expect(body.groups).to.be.an('array');
          expect(body.apikeys).to.be.an('array');
          expect(body.name).to.be.equal(name);
          expect(body.email).to.be.equal(email);
          expect(body.registered).to.be.an('string');
          expect(body.lastVisited).to.be.an('string');
        });
    });
    it('logout', function () {
      return superagent.post(`${protocol}://${name}:${password}@${host}:${port}/auth/logout`)
        .end()
        .then(res => res.body)
        .then((body) => {
          expect(body).to.be.deep.equal({});
        });
    });
  });
  describe('github', function () {
    it('get clientID', function () {
      return superagent.get(`${api}/auth/github/id`)
        .end()
        .then(res => res.body)
        .then((body) => {
          expect(body.clientID).to.be.equal('github-client-id');
        });
    });
    describe('credentials', function () {
      it('bad credentials', function () {
        return superagent.post(`${api}/auth/github`, {code: 'invalid'})
          .end()
          .reflect()
          .then((promise) => {
            const {response} = promise.reason();
            expect(promise.isRejected()).to.be.true;
            expect(response.status).to.be.equal(401);
          });
      });
    });
    describe('access_token', function () {
      it('bad credentials', function () {
        return superagent.post(`${api}/auth/github/token`, {access_token: 'abc'})
          .end()
          .reflect()
          .then((promise) => {
            const {response} = promise.reason();
            expect(promise.isRejected()).to.be.true;
            expect(response.status).to.be.equal(401);
          });
      });
    });
  });
  describe('google', function () {
    it('get clientID', function () {
      return superagent.get(`${api}/auth/google/id`)
        .end()
        .then(res => res.body)
        .then((body) => {
          expect(body.clientID).to.be.equal('google-client-id');
        });
    });
  });
});
