// native modules
const {spawnSync} = require('child_process');
const path = require('path');
// 3rd party modules
const jwtSimple = require('jwt-simple');
const moment = require('moment');

function createToken(payload = {
  iat: moment().unix(),
  exp: moment().add(2, 'h').unix()}, webtoken) {
  return jwtSimple.encode(payload, webtoken);
}

function createUserToken({userId, group, groupId, webtoken, expHours = 2}) {
  // Create token for requests
  const payload = {
    _id: userId,
    groups: [{name: group, _id: groupId}],
    iat: moment().unix(),
    exp: moment().add(expHours, 'h').unix()
  };

  const token = createToken(payload, webtoken);
  const authString = `Bearer ${token}`;
  const query = `token=${token}`;
  return {token, authString, query};
}

const api = 'http://localhost:3000';
const apiV0 = `${api}/api/v0`;

function dbRestore() {
  const root = path.join(__dirname, '../..');
  const dbrestore = path.join(root, 'scripts/dbrestore.sh');
  const args = ['local', path.join(root, 'test/seeds/test_dump')];
  spawnSync(dbrestore, args);
}


module.exports = {
  createToken,
  createUserToken,
  dbRestore,
  api,
  apiV0
};
