/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('chai');
const chaiSubset = require('chai-subset');
const logger = require('winston');

// Local components
const {setup, reset, teardown} = require('./mongomock');
require('./../../app/models/campaign.js');
const CampaignController = require('./../../app/controllers/campaigns.js');

// Setup
logger.level = 'error';
chai.use(chaiSubset);

// Test variables
const {expect} = chai;
let controller = null;

describe('controllers/campaigns.js', function () {
  // Create fresh DB
  before(setup);

  beforeEach(reset);

  after(teardown);

  it('constructor', function () {
    // Create controller to test
    controller = new CampaignController();
    expect(controller).to.exist; // eslint-disable-line no-unused-expressions
  });
});
