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
require('./../../app/models/campaign.js');
const CampaignController = require('./../../app/controllers/campaigns.js');

// Setup
logger.level = 'error';
mongoose.Promise = Promise;
chai.use(chaiSubset);

// Test variables
const mockgoose = new Mockgoose(mongoose);
const expect = chai.expect;
let controller = null;

describe('controllers/campaigns.js', function () {
  // Create fresh DB
  before(function () {
    return setup();
  });

  beforeEach(function () {
    return beforeEach();
  });

  after(function () {
    return teardown();
  });

  it('constructor', function () {
    // Create controller to test
    controller = new CampaignController();
    expect(controller).to.exist; // eslint-disable-line no-unused-expressions
  });
});
