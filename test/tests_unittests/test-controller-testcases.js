// Third party components
const colors = require('colors');

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
const TestcasesController = require('./../../app/controllers/testcases.js');
let controller = null;

const MockResponse = require('./mocking/MockResponse.js');


describe('controllers/testcases.js', () => {
  // Create fresh DB
  before((done) => {
    console.log('    [Before]'.gray);
    console.log('    * Preparing storage'.gray);
    mockgoose.prepareStorage().then(() => {
      console.log('    * Connecting to mongo\n'.gray);
      mongoose.connect('mongodb://testmock.com/TestingDB', (error) => {
        should.not.exist(error);
         
        // Loading models requires active mongo
        try {
          require('./../../app/models/testcase.js');
        } catch(e) {
          if (e.name !== 'OverwriteModelError') { throw (e); }
        }
        
        // Some library, probably mockgoose, leaks this global variable that needs to be purged
        delete check;

        console.log('    [Tests]'.gray);
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
    console.log('\n    [After]'.gray);
    console.log('    * Closing mongoose connection'.gray);
    mongoose.disconnect();
    done();
  });

  it('constructor', (done) => {
    controller = new TestcasesController();
    should.exist(controller);
    done();
  });
});
