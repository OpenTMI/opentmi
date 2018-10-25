/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const stream = require('stream');
const {expect} = require('chai');
const Promise = require('bluebird');

// Local components
require('../../../app/models/build.js');
require('../../../app/models/testcase.js');
require('../../../app/models/results.js');
const ResultsController = require('../../../app/controllers/results.js');
const MockResponse = require('./mocking/MockResponse.js');
const mockJunitXml = require('./mocking/MockJunitXmlTests.js');
const {setup, reset, teardown} = require('../../utils/mongomock');


// Test variables
let controller = null;

describe('controllers/results.js', function () {
  // Create fresh DB
  before(setup);
  before(function () {
    // Test that controller can be initialized before other tests
    controller = new ResultsController();
  });
  beforeEach(reset);
  after(teardown);

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
    it('should call getBuildRef and redirect to build route', function (done) {
      let buildCalled = false;
      const req = {
        params: {Index: 90123},
        Result: {getBuildRef() {
          buildCalled = true;
          return '5';
        }}
      };

      let redirectCalled = false;
      const res = {
        redirect(url) {
          expect(url.indexOf('/5/')).to.not.equal(-1, 'url should contain build id substring /5/');
          expect(url.indexOf('/90123/')).to.not.equal(-1, 'url should contain Index substring /90123/');
          expect(buildCalled).to.equal(true, 'getBuildRef should be called before redirect');
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
