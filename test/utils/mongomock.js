const Promise = require('bluebird');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

mongoose.Promise = Promise;

let mongoServer;
const opts = {  }; // remove this option if you use mongoose 5 and above


module.exports = {
  setup: async function setup() {
    mongoServer = new MongoMemoryServer();
    const mongoUri = await mongoServer.getUri();
    await mongoose.connect(mongoUri, opts);
  },
  reset: async function () {
    await mongoServer.stop();
    await mongoServer.start();
    const mongoUri = await mongoServer.getUri();
    await mongoose.connect(mongoUri, opts);
  },
  teardown: async function teardown() {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
};
