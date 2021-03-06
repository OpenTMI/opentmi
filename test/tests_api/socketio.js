/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const _ = require('lodash');
const logger = require('winston');
const IO = require('socket.io-client');
const superagent = require('superagent');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// application modules
const config = require('../../app/tools/config');
const {createUserToken, testUserId} = require('./tools/helpers');

// Setup
chai.use(chaiAsPromised);
const {expect, assert} = chai;
logger.level = 'error';

// Test variables
const host = 'http://localhost:3000';
const api = `${host}/api/v0`;

const ioConnect = (token, namespace = '') => new Promise((resolve, reject) => {
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
  let token, authString;
  // Create fresh DB
  before(function () {
    const tokenInput = {
      userId: testUserId,
      group: 'admins',
      webtoken: config.get('webtoken')
    };
    const tokenObj = createUserToken(tokenInput);
    token = tokenObj.token;
    authString = tokenObj.authString;
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
    it('join(logs)', function () {
      const log = new Promise((resolve) => {
        superagent.get(`${host}/api`)
          .end((error, {body}) => {
            const {isMaster} = body;
            if (!isMaster) {
              resolve();
            }
          });
        io.once('log', (line) => {
          expect(line).to.be.a('string');
          resolve();
        });
      });
      const join = new Promise(resolve => io.emit('join', {room: 'logs'}, (error) => {
        expect(error).to.be.undefined;
        resolve();
      }));
      return Promise.all([log, join]);
    });
    it('leave(logs)', function () {
      const join = new Promise(resolve => io.emit('join', {room: 'logs'}, (error) => {
        expect(error).to.be.undefined;
        resolve();
      }));
      const leave = () => new Promise(resolve => io.emit('leave', {room: 'logs'}, (error) => {
        expect(error).to.be.undefined;
        resolve();
      }));
      return join.then(leave);
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
        .end((error) => {
          expect(error).to.not.exist;
        });
    });
  });
});
