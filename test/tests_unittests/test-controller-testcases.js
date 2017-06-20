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

const winston = require('winston');
winston.level = 'error';

// Local components
const TestcasesController = require('./../../app/controllers/testcases.js');
let controller = null;

const MockResponse = require('./mocking/MockResponse.js');


describe('controllers/testcases.js', () => {
  // Create fresh DB
  before(function (done) {
    console.log('    [Before]'.gray);
    console.log('    * Preparing storage'.gray);
    mockgoose.prepareStorage().then(() => {
      console.log('    * Connecting to mongo\n'.gray);
      mongoose.connect('mongodb://testmock.com/TestingDB', (error) => {
        expect(error).to.not.exist;
         
        // Loading models requires active mongo
        try {
          require('./../../app/models/testcase.js');
        } catch (e) {
          if (e.name !== 'OverwriteModelError') { throw (e); }
        }
        
        console.log('    [Tests]'.gray);
        done();
      });
    });
  });

  beforeEach(function (done) {
    mockgoose.helper.reset().then(() => {
      // Load mock items
      done();
    });
  });

  after(function (done) {
    console.log('\n    [After]'.gray);
    console.log('    * Closing mongoose connection'.gray);
    mongoose.disconnect();
    done();
  });

  it('constructor', function (done) {
    controller = new TestcasesController();
    expect(controller).to.exist;
    done();
  });
});
