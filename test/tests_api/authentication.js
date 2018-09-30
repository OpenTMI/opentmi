/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
// Third party components
const Promise = require('bluebird');
const superagentPromise = require('superagent-promise');
const superagent = superagentPromise(require('superagent'), Promise);
const {expect} = require('chai');
const logger = require('winston');

// Setup
logger.level = 'error';
const {api} = require('./tools/helpers');


describe('authentication', function () {
  describe('github', function () {
    it('get clientID', function () {
      return superagent.get(`${api}/auth/github/id`)
        .end()
        .then(res => res.body)
        .then((body) => {
          expect(body.clientID).to.be.an('string');
        });
    });
  });
  describe('google', function () {
    it('get clientID', function () {
      return superagent.get(`${api}/auth/google/id`)
        .end()
        .then(res => res.body)
        .then((body) => {
          expect(body.clientID).to.be.an('string');
        });
    });
  });
});
