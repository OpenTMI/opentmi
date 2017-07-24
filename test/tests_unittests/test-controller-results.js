/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
require('colors');
const stream = require('stream');
const chai = require('chai');
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const mongoose = require('mongoose');
const Mockgoose = require('mockgoose').Mockgoose;
const Promise = require('bluebird');
const logger = require('winston');

// Local components
require('./../../app/models/build.js');
require('./../../app/models/testcase.js');
require('./../../app/models/results.js');
const ResultsController = require('./../../app/controllers/results.js');
const MockResponse = require('./mocking/MockResponse.js');
const mockJunitXml = require('./mocking/MockJunitXmlTests.js');

// Setup
logger.level = 'error';
mongoose.Promise = Promise;
chai.use(chaiSubset);
chai.use(chaiAsPromised);

// Test variables
const mockgoose = new Mockgoose(mongoose);
const expect = chai.expect;
let controller = null;

describe('controllers/results.js', () => {
  // Create fresh DB
  before(function () {
    mockgoose.helper.setDbVersion('3.2.1');

    logger.debug('[Before] Preparing storage'.gray);
    return mockgoose.prepareStorage().then(() => {
      logger.debug('[Before] Connecting to mongo\n'.gray);
      return mongoose.connect('mongodb://testmock.com/TestingDB').then(() => {
        // Test that controller can be initialized before other tests
        controller = new ResultsController();
      });
    });
  });

  beforeEach(function () {
    return mockgoose.helper.reset();
  });

  after(function (done) {
    logger.debug('[After] Closing mongoose connection'.gray);
    mongoose.disconnect();
    done();
  });

  it('streamToString', function () {
    const mockedStream = stream.Readable();
    mockedStream._read = function () { };

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
      expect(promiseTypo).to.be.rejectedWith(TypeError)
    ]);
  });


  it('createFromJunitXml', function () {
    const req = {busboy: stream.Readable()};
    req.busboy._read = function () { };

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
      expect(invalidHandleJunitCreationPromise).to.be.rejectedWith(Error)
    ]);
  });
});
