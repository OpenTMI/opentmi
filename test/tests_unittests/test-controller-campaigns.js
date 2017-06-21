/* global describe before beforeEach after it */
/* eslint-disable */
// Third party components
const colors = require('colors');

const chai = require('chai');
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);
const expect = chai.expect;

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const Mockgoose = require('mockgoose').Mockgoose;
const mockgoose = new Mockgoose(mongoose);

require('./../../app/models/campaign.js');

const winston = require('winston');
winston.level = 'error';

// Local components
const CampaignController = require('./../../app/controllers/campaigns.js');
let controller = null;
const MockResponse = require('./mocking/MockResponse.js');
/* eslint-enable */


describe('controllers/campaigns.js', () => {
  // Create fresh DB
  before(function () {
    mockgoose.helper.setDbVersion('3.2.1');

    console.log('    [Before]'.gray);
    console.log('    * Preparing storage'.gray);
    return mockgoose.prepareStorage().then(() => {
      console.log('    * Connecting to mongo\n'.gray);
      return mongoose.connect('mongodb://testmock.com/TestingDB').then(() => console.log('    [Tests]'.gray));
    });
  });

  beforeEach(function () {
    return mockgoose.helper.reset();
  });

  after((done) => {
    console.log('\n    [After]'.gray);
    console.log('    * Closing mongoose connection'.gray);
    mongoose.disconnect();
    done();
  });

  it('constructor', (done) => {
    // Create controller to test
    controller = new CampaignController();
    expect(controller).to.exist; // eslint-disable-line no-unused-expressions
    done();
  });
});
