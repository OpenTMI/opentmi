/* global describe before beforeEach after it */
/* eslint-disable */
// Third party components
const colors = require('colors');
const stream = require('stream');

const chai = require('chai');
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiSubset);
chai.use(chaiAsPromised);
const expect = chai.expect;

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const Mockgoose = require('mockgoose').Mockgoose;
const mockgoose = new Mockgoose(mongoose);

require('./../../app/models/build.js');
require('./../../app/models/testcase.js');
require('./../../app/models/results.js');

const logger = require('winston');
logger.level = 'error';

// Local components
const ResultsController = require('./../../app/controllers/results.js');
let controller = null;

const MockResponse = require('./mocking/MockResponse.js');
const mockJunitXml = require('./mocking/MockJunitXmlTests.js');
/* eslint-enable */


describe('controllers/results.js', () => {
  // Create fresh DB
  before(function () {
    mockgoose.helper.setDbVersion('3.2.1');

    console.log('    [Before]'.gray);
    console.log('    * Preparing storage'.gray);
    return mockgoose.prepareStorage().then(() => {
      console.log('    * Connecting to mongo\n'.gray);
      return mongoose.connect('mongodb://testmock.com/TestingDB').then(() => {
        // Test that controller can be initialized before other tests
        controller = new ResultsController();
        console.log('    [Tests]'.gray);
      });
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

  it('streamToString', function () {
    const mockedStream = stream.Readable();
    mockedStream._read = function (size) { };

    const stringPromise = ResultsController.streamToString(mockedStream);

    // Stream mock data
    mockedStream.emit('data', 'chunk1');
    mockedStream.emit('data', 'chunk2');
    mockedStream.emit('data', 'chunk3');
    mockedStream.emit('end');

    return expect(stringPromise).to.eventually.equal('chunk1chunk2chunk3');
  });


  it('handleJunitXml', function () {
    // Valid case, proper junit xml
    const promiseValid = controller.handleJunitXml(mockJunitXml.valid).then((value) => {
      expect(value).to.not.have.property('error');
      expect(value).to.have.property('ok');
      expect(value).to.have.property('message', 'created 2 results');
    });

    const promiseInvalid = controller.handleJunitXml('Invalid xml! 823y49');
    const promiseTypo = controller.handleJunitXml(mockJunitXml.typo);

    return Promise.all([
      expect(promiseValid).to.not.be.rejected,
      expect(promiseInvalid).to.be.rejectedWith(Error),
      expect(promiseTypo).to.be.rejectedWith(TypeError),
    ]);
  });


  it('createFromJunitXml', function () {
    const req = { busboy: stream.Readable() };
    req.busboy._read = function (size) { };

    const res = new MockResponse((value) => {
      expect(value).to.have.property('error');
    }, (value) => {
      expect(value).to.equal(400);
    });

    // Everything goes ok
    let modifiedController = new ResultsController();
    modifiedController.streamToString = () => new Promise((resolve) => {
      resolve('combined_stream_string');
    });
    modifiedController.handleJunitXml = () => new Promise((resolve) => {
      resolve('ok');
    });
    const validCreationPromise = modifiedController.createFromJunitXml(req, res);

    // StreamToString is rejected
    modifiedController = new ResultsController();
    modifiedController.streamToString = () => new Promise((resolve, reject) => {
      reject(new Error('Make-believe error from streamToString'));
    });
    modifiedController.handleJunitXml = () => new Promise((resolve) => {
      resolve('ok');
    });
    const invalidStreamCreationPromise = modifiedController.createFromJunitXml(req, res);

    // HandleJunitXml is rejected
    modifiedController = new ResultsController();
    modifiedController.streamToString = () => new Promise((resolve, reject) => {
      reject(new Error('Make-believe error from streamToString'));
    });
    modifiedController.handleJunitXml = () => new Promise((resolve) => {
      resolve('ok');
    });
    const invalidHandleJunitCreationPromise = modifiedController.createFromJunitXml(req, res);

    // Mock file event for promises
    req.busboy.emit('file', 'mockFieldName', 'mockFile', 'mockFilename', 'mockEncoding', 'mockMimetype');

    // Ensure promises return correct values
    return Promise.all([
      expect(validCreationPromise).to.eventually.equal('ok'),
      expect(invalidStreamCreationPromise).to.be.rejectedWith(Error),
      expect(invalidHandleJunitCreationPromise).to.be.rejectedWith(Error),
    ]);
  });
});
