// Third party components
const should = require('should');
const chai = require('chai');
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);
const expect = chai.expect;

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const Mockgoose = require('mockgoose').Mockgoose;
const mockgoose = new Mockgoose(mongoose);

const winston = require('winston');
winston.level = 'error';

// Local components
const CampaignController = require('./../../app/controllers/campaigns.js');
let controller = null;
const MockResponse = require('./mocking/MockResponse.js');


describe('controllers/campaigns.js', () => {
  // Create fresh DB
  before((done) => {
    console.log('    [Before]');
    console.log('     * Preparing storage');
    mockgoose.prepareStorage().then(() => {
      console.log('     * Connecting to mongo\n');
      mongoose.connect('mongodb://testmock.com/TestingDB', (error) => {
        should.not.exist(error);
         
        // Loading models requires active mongo
        try {
          require('./../../app/models/campaign.js');
        } catch(e) {
          if (e.name !== 'OverwriteModelError') { throw (e); }
        }

        // Some library, probably mockgoose, leaks this global variable that needs to be purged
        delete check;

        console.log('    [Tests]');
        done();
      });
    });
  });

  beforeEach((done) => {
    mockgoose.helper.reset().then(() => {
      // Load mock items
      done();
    });
  });

  after((done) => {
    console.log('\n    [After]');
    console.log('     * Closing mongoose connection');
    mongoose.disconnect();
    done();
  });

  it('constructor', (done) => {
    // Create controller to test
    controller = new CampaignController();
    should.exist(controller);
    done();
  });
});
