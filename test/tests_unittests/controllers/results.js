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
require('../../../app/models/build.js');
require('../../../app/models/testcase.js');
require('../../../app/models/results.js');
const ResultsController = require('../../../app/controllers/results.js');
const MockResponse = require('../mocking/MockResponse.js');
const mockJunitXml = require('../mocking/MockJunitXmlTests.js');

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

  describe('streamToString', function () {
    it('should concat streamed data correctly', function () {
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
  });


  describe('handleJunitXml', function () {
    it('should result in message created 2 results', function () {
      // Valid case, proper junit xml
      return controller.handleJunitXml(mockJunitXml.valid).then((value) => {
        expect(value).to.not.have.property('error');
        expect(value).to.have.property('ok');
        expect(value).to.have.property('message', 'created 2 results');
      });
    });

    it('should be rejected when input is invalid xml', function () {
      return expect(controller.handleJunitXml('Invalid xml! 823y49')).to.be.rejectedWith(Error);
    });

    it('should be rejected when input is not JunitXml', function () {
      return expect(controller.handleJunitXml(mockJunitXml.typo)).to.be.rejectedWith(TypeError);
    });
  });

  describe('createFromJunitXml', function () {
    let req;
    let res;

    beforeEach(function () {
      controller = new ResultsController();

      req = {busboy: stream.Readable()};
      req.busboy._read = function () { };

      res = new MockResponse((value) => {
        expect(value).to.have.property('error');
      }, (value) => {
        expect(value).to.equal(400);
      });
    });

    it('should result in ok', function () {
      controller.streamToString = () => Promise.resolve('combined_stream_string');
      controller.handleJunitXml = () => Promise.resolve('ok');
      const createPromise = controller.createFromJunitXml(req, res);

      req.busboy.emit('file', 'mockFieldName', 'mockFile', 'mockFilename', 'mockEncoding', 'mockMimetype');

      return expect(createPromise).to.eventually.equal('ok');
    });

    it('should be rejected when streamToString is rejected', function () {
      controller.streamToString = () => Promise.reject(new Error('Make-believe error from streamToString'));
      controller.handleJunitXml = () => Promise.resolve('ok');
      const createPromise = controller.createFromJunitXml(req, res);

      req.busboy.emit('file', 'mockFieldName', 'mockFile', 'mockFilename', 'mockEncoding', 'mockMimetype');

      return expect(createPromise).to.be.rejectedWith(Error);
    });

    it('should be rejected when handleJunitXml is rejected', function () {
      controller.streamToString = () => Promise.reject(new Error('Make-believe error from streamToString'));
      controller.handleJunitXml = () => Promise.resolve('ok');
      const createPromise = controller.createFromJunitXml(req, res);

      req.busboy.emit('file', 'mockFieldName', 'mockFile', 'mockFilename', 'mockEncoding', 'mockMimetype');

      return expect(createPromise).to.be.rejectedWith(Error);
    });
  });

  describe('buildDownload', function () {
    it('should call getBuildId and redirect to build route', function (done) {
      let buildCalled = false;
      const req = {
        params: {Index: 90123},
        Result: {getBuildId() {
          buildCalled = true;
          return '5';
        }}
      };

      let redirectCalled = false;
      const res = {
        redirect(url) {
          expect(url.indexOf('/5/')).to.not.equal(-1, 'url should contain build id substring /5/');
          expect(url.indexOf('/90123/')).to.not.equal(-1, 'url should contain Index substring /90123/');
          expect(buildCalled).to.equal(true, 'getBuildId should be called before redirect');
          redirectCalled = true;
        }
      };

      ResultsController.buildDownload(req, res);

      expect(buildCalled).to.equal(true, 'build should be called at some point');
      expect(redirectCalled).to.equal(true, 'redirect should be called at some point');

      done();
    });
  });
});
