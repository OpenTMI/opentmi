/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
require('colors');
const chai = require('chai');
const chaiSubset = require('chai-subset');
const mongoose = require('mongoose');
const Mockgoose = require('mockgoose').Mockgoose;
const logger = require('winston');
const Promise = require('bluebird');

// Local components
const {setup, beforeEach, teardown} = require('./mongomock');
require('./../../app/models/group.js');
const GroupsController = require('./../../app/controllers/groups.js');

// Setup
logger.level = 'error';
mongoose.Promise = Promise;
chai.use(chaiSubset);

// Test variables
const expect = chai.expect;
let controller = null;

describe('controllers/groups.js', function () {
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

  it('constructor', function (done) {
    controller = new GroupsController();
    expect(controller).to.exist; // eslint-disable-line no-unused-expressions
    done();
  });
});
