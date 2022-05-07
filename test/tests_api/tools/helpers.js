// 3rd party modules
const jwtSimple = require('jwt-simple');
const moment = require('moment');
const Promise = require('bluebird');
const superagentPromise = require('superagent-promise');
const superagent = superagentPromise(require('superagent'), Promise);
// app modules
const config = require('../../../app/tools/config');

function createToken(payload = {
  iat: moment().unix(),
  exp: moment().add(2, 'h').unix()
}, webtoken) {
  return jwtSimple.encode(payload, webtoken);
}

function createUserToken({
  userId, group, webtoken = config.get('webtoken'), expHours = 2
}) {
  // Create token for requests
  const payload = {
    _id: userId,
    groups: [group],
    iat: moment().unix(),
    exp: moment().add(expHours, 'h').unix()
  };

  const token = createToken(payload, webtoken);
  const authString = `Bearer ${token}`;
  const query = `token=${token}`;
  return {token, authString, query};
}

const testUserId = '5825bb7afe7545132c88c761';
const protocol = 'http';
const host = 'localhost';
const port = '3000';
const api = `${protocol}://${host}:${port}`;
const apiV0 = `${api}/api/v0`;

function getTestUserToken() {
  const {authString} = createUserToken({userId: testUserId, group: 'admins'});
  return authString;
}
function createUser({name, email, password}) {
  const body = {name, email, password};
  const authString = getTestUserToken();
  return superagent.post(`${apiV0}/users`)
    .send(body)
    .set('authorization', authString)
    .end()
    .then((res) => res.body);
}
function deleteUser(userId) {
  const authString = getTestUserToken();
  return superagent.del(`${apiV0}/users/${userId}`)
    .set('authorization', authString)
    .end()
    .then((res) => res.body);
}

module.exports = {
  testUserId,
  createToken,
  getTestUserToken,
  createUserToken,
  createUser,
  deleteUser,
  protocol,
  port,
  host,
  api,
  apiV0
};
