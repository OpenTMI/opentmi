/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const jwtSimple = require('jwt-simple');
const nconf = require('../../config');
const moment = require('moment');
const logger = require('winston');
const IO = require('socket.io-client');
const {expect} = require('chai');

// Setup
logger.level = 'error';

// Test variables
const host = 'http://localhost:3000';

const ioConnect = token => new Promise((resolve) => {
  const options = {
    query: `token=${token}`
  };
  const io = IO(host, options);
  io.once('connect', () => resolve(io));
});
const ioDisconnect = client => Promise.resolve(client.disconnect());

describe('Basic socketio tests', function () {
  const testUserId = '5825bb7afe7545132c88c761';
  let token;
  // Create fresh DB
  before(function () {
    // Create token for requests
    const payload = {
      sub: testUserId,
      group: 'admins',
      iat: moment().unix(),
      exp: moment().add(2, 'h').unix()
    };
    token = jwtSimple.encode(payload, nconf.get('webtoken'));
  });

  it('connection works', function () {
    return ioConnect(token);
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
        expect(me).to.have.property('group');
        done();
      });
    });
  });
});
