const Promise = require('bluebird');
const mongoose = require('mongoose');
const {MongoMemoryServer} = require('mongodb-memory-server');

mongoose.Promise = Promise;

let mongoServer;
const opts = {useNewUrlParser: true}; // remove this option if you use mongoose 5 and above


async function setup() {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, opts);
}

async function teardown() {
  await mongoose.disconnect();
  await mongoServer.stop();
}

async function reset() {
  await teardown();
  await setup();
}

module.exports = {setup, reset, teardown};
