/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('chai');

// Local components
const {setup, reset, teardown} = require('../../utils/mongomock');
require('./../../../app/models/campaign.js');
const CampaignController = require('./../../../app/controllers/campaigns.js');


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
