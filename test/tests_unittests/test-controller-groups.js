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
const GroupsController = require('./../../app/controllers/groups.js');
let controller = null;
const MockResponse = require('./mocking/MockResponse.js');


describe('controllers/groups.js', () => {
  // Create fresh DB
  before((done) => {
    mockgoose.helper.setDbVersion('3.2.1');

    console.log('    [Before]'.gray);
    console.log('    * Preparing storage'.gray);
    mockgoose.prepareStorage().then(() => {
      console.log('    * Connecting to mongo\n'.gray);
      mongoose.connect('mongodb://testmock.com/TestingDB', (error) => {
        expect(error).to.not.exist;
         
        // Loading models requires active mongo
        try {
          require('./../../app/models/group.js');
        } catch (e) {
          if (e.name !== 'OverwriteModelError') { throw (e); }
        }

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
    controller = new GroupsController();
    expect(controller).to.exist;
    done();
  });
});
