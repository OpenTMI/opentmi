/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const _ = require('lodash');
const jwtSimple = require('jwt-simple');
const nconf = require('../../config');
const moment = require('moment');
const logger = require('winston');
const IO = require('socket.io-client');
const superagent = require('superagent');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const {expect, assert} = chai;
// Setup
logger.level = 'error';

// Test variables
const host = 'http://localhost:3000';
const api = `${host}/api/v0`;

const ioConnect = (token, namespace='') => new Promise((resolve, reject) => {
  const options = {
    query: `token=${token}`
  };
  const client = IO(`${host}${namespace}`, options);

  const _reject = (error) => {
    client.disconnect();
    reject(error);
  };
  client.once('connect', () => {
    client.removeListener('connect_error', reject);
    client.removeListener('connect_timeout', reject);
    client.removeListener('error', reject);
    resolve(client);
  });
  client.once('error', _reject);
  client.once('connect_error', _reject);
  client.once('connect_timeout', _reject);
});
const ioDisconnect = (client) => {
  if (_.isObject(client)) {
    return Promise.resolve(client.disconnect());
  }
  return Promise.resolve();
};

describe('Basic socketio tests', function () {
  const testUserId = '5825bb7afe7545132c88c761';
  let token, authString;
  // Create fresh DB
  before(function () {
    // Create token for requests
    const payload = {
      _id: testUserId,
      groups: ['admins'],
      iat: moment().unix(),
      exp: moment().add(2, 'h').unix()
    };
    token = jwtSimple.encode(payload, nconf.get('webtoken'));
    authString = `Bearer ${token}`;
  });

  it('connection works', function () {
    return ioConnect(token)
      .then(io => ioDisconnect((io)));
  });
  it('connection denied when invalid token', function () {
    return assert.isRejected(ioConnect('invalid_token'), /jwt malformed/);
  });

  describe('io queries', function () {
    let io;
    beforeEach(function () {
      return ioConnect(token)
        .then((client) => { io = client; });
    });
    afterEach(function () {
      return ioDisconnect(io);
    });
    it('whoami', function (done) {
      io.emit('whoami', (error, me) => {
        expect(me).to.have.property('isAdmin');
        expect(me).to.have.property('groups');
        done();
      });
    });
  });
  describe('results namespace', function () {
    let io;
    beforeEach(function () {
      return ioConnect(token, '/results')
        .then((client) => {
          io = client;
        });
    });
    afterEach(function () {
      return ioDisconnect(io);
    });
    it('new result', function (done) {
      const newResult = {tcid: '123', exec: {verdict: 'pass'}};
      io.on('new', (result) => {
        expect(result).to.have.property('_id');
        expect(result.tcid).to.be.equal(newResult.tcid);
        done();
      });
      superagent.post(`${api}/results`)
        .set('authorization', authString)
        .send(newResult)
        .end((error, res) => {
          expect(error).to.not.exist;
        });
    });
  });
});
