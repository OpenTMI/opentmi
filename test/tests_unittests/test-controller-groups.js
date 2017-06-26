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

require('./../../app/models/group.js');

const winston = require('winston');
winston.level = 'error';

// Local components
const GroupsController = require('./../../app/controllers/groups.js');
let controller = null;
const MockResponse = require('./mocking/MockResponse.js');
/* eslint-enable */


describe('controllers/groups.js', () => {
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

  after(function (done) {
    console.log('\n    [After]'.gray);
    console.log('    * Closing mongoose connection'.gray);
    mongoose.disconnect();
    done();
  });

  it('constructor', function (done) {
    controller = new GroupsController();
    expect(controller).to.exist; // eslint-disable-line no-unused-expressions
    done();
  });
});
