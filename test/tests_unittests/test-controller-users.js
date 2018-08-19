/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
require('colors');
const chai = require('chai');
const chaiSubset = require('chai-subset');
const mongoose = require('mongoose');
const logger = require('winston');
const Promise = require('bluebird');

// Local components
const {setup, beforeEach, teardown} = require('./mongomock');
require('./../../app/models/group.js');
require('./../../app/models/user.js');
const UsersController = require('./../../app/controllers/users.js');

// Setup
logger.level = 'error';
mongoose.Promise = Promise;
chai.use(chaiSubset);

// Test variables
const expect = chai.expect;
let controller = null;

describe('controllers/users.js', function () {
  // Create fresh DB
  before(function () {
    return setup();
  });

  beforeEach(function () {
    return beforeEach();
  });

  after(function () {
    logger.debug('[After] Closing mongoose connection'.gray);
    return teardown();
  });

  it('constructor', function () {
    controller = new UsersController();
    expect(controller).to.exist;
  });
});
