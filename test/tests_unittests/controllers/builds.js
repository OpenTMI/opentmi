/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('chai');
const chaiSubset = require('chai-subset');
const mongoose = require('mongoose');
const logger = require('winston');
const Promise = require('bluebird');

// Setup
logger.level = 'error';
mongoose.Promise = Promise;
chai.use(chaiSubset);

const {setup, reset, teardown} = require('../mongomock');

// Test variables
const expect = chai.expect;

describe('controllers/builds.js', function () {
  let BuildsController;
  // Create fresh DB
  before(setup);
  before(function () {
    // Local components
    require('../../../app/models/build.js'); // eslint-disable-line global-require
    BuildsController = require('../../../app/controllers/builds.js'); // eslint-disable-line global-require
  });
  beforeEach(reset);

  after(teardown);

  describe('exports', function () {
    it('should export a class named BuildsController', function (done) {
      expect(BuildsController).to.have.property('name', 'BuildsController');
      done();
    });
  });

  describe('BuildsController', function () {
    it('should define correct interface on static level', function (done) {
      expect(BuildsController).to.have.property('indexParam').which.is.a('function');
      expect(BuildsController).to.have.property('download').which.is.a('function');
      done();
    });

    describe('indexParam', function () {
      it('should assign numeric Index to request root', function (done) {
        const req = {};
        const res = {};

        let nextCalled = false;
        const next = () => {
          nextCalled = true;
        };

        BuildsController.indexParam(req, res, next, '1078');

        expect(nextCalled).to.equal(true, 'next should be called');
        expect(req).to.have.property('Index', 1078);

        done();
      });

      it('should return error when Index is unparsable', function (done) {
        const req = {};
        const res = {};

        let nextCalled = false;
        const next = (error) => {
          expect(error).to.exist;
          expect(error).to.have.property('status', 400);
          expect(error).to.have.property('message', 'Index must be an integer number');
          nextCalled = true;
        };

        BuildsController.indexParam(req, res, next, 'NotANumber');

        expect(nextCalled).to.equal(true, 'next should be called even with errors');

        done();
      });
    });

    describe('download', function () {
      it('should call getFile and send that result to client', function () {
        const req = {
          Build: {
            getFile() {
              const file = {
                name: 'Juhani.html',
                data: 'data1data2data3',
                encoding: 'base64'
              };

              return Promise.resolve(file);
            }
          }
        };

        let writeCalled = false;
        let endCalled = false;
        const res = {
          writeHead(status, header) {
            expect(status).to.equal(200);
            expect(header).to.have.property('Content-Type', 'text/html');
            expect(header).to.have.property('Content-disposition', 'attachment;filename=Juhani.html');
            expect(header).to.have.property('Content-Length', 15);
            expect(header).to.have.property('Content-Encoding', 'base64');
            writeCalled = true;
          },
          end(data) {
            expect(writeCalled).to.equal(true, 'write should be called before write');
            expect(data).to.equal('data1data2data3');
            endCalled = true;
          }
        };

        return BuildsController.download(req, res, () => {
          throw new Error('Should not call next');
        })
          .then(() => {
            expect(writeCalled).to.equal(true, 'write should be called');
            expect(endCalled).to.equal(true, 'end should be called');
          });
      });

      it('should catch error thrown by getFile and pipe it to next', function () {
        const req = {
          Build: {
            getFile() {
              return Promise.reject(new Error('FileReadFailed'));
            }
          }
        };

        const res = {};

        let doneCalled = false;
        return BuildsController.download(req, res, (error) => {
          expect(error).to.exist;
          expect(error).to.have.property('message', 'Could not download file: FileReadFailed');
          doneCalled = true;
        })
          .then(() => {
            expect(doneCalled).to.equal(true, 'done should be called');
          });
      });
    });
  });
});
