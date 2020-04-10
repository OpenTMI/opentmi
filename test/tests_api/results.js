/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Native components
const path = require('path');
const fs = require('fs');

// Third party components
const superagent = require('superagent');
const {expect} = require('chai');
const logger = require('winston');

// Local components
const config = require('../../app/tools/config');
const {createUserToken, testUserId} = require('./tools/helpers');
// Setup
logger.level = 'error';

// Test variables
const api = 'http://localhost:3000/api/v0';

const validResultBody = require('./mocking/mockResult.json');

const existingResultId = '5858375fbee7d73c703c5e13';

const relativeFiledbPath = config.get('filedb');
const absoluteFiledbPath = path.resolve(__dirname, '..', '..', relativeFiledbPath);

let authString;

describe('Results', function () {
  // Create fresh DB
  before(function () {
    this.timeout(5000);
    const tokenInput = {
      userId: testUserId,
      group: 'admins',
      webtoken: config.get('webtoken')
    };
    authString = createUserToken(tokenInput).authString;
  });

  it('should get count as a object', function (done) {
    superagent.get(`${api}/results?t=count`)
      .set('authorization', authString)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('count');
        expect(res.body.count).to.be.an('number');
        done();
      });
  });

  it('should return a single result on results/<id> GET', function (done) {
    superagent.get(`${api}/results/${existingResultId}`)
      .set('authorization', authString)
      .type('json')
      .end(function (error, res) {
        expect(error).to.not.exist;
        expect(res.body._id).to.equal(existingResultId);
        done();
      });
  });

  it('should accept POST with valid body', function (done) {
    const requestBody = JSON.parse(JSON.stringify(validResultBody));

    superagent.post(`${api}/results`)
      .set('authorization', authString)
      .send(requestBody)
      .end((error, res) => {
        expect(error).to.not.exist;

        expect(res).to.have.property('status', 200);
        requestBody._id = res.body._id;
        // Should have all the root level properties
        Object.keys(requestBody).forEach((key) => {
          expect(res.body).to.have.property(key);
        });

        // Check special cases, eg. logs
        expect(res.body.exec).to.have.property('logs').which.is.an('array');
        expect(res.body.exec.logs).to.have.lengthOf(1);
        expect(res.body.exec).to.have.property('duts').which.is.an('array');
        expect(res.body.exec.duts).to.have.lengthOf(1);
        expect(res.body.exec.dut).to.be.deep.equal(res.body.exec.duts[0]);
        expect(res.body.exec.duts[0].platform).to.be.equal('custom');

        // Check log sanity
        expect(res.body.exec.logs[0]).to.not.have.property('data');
        expect(res.body.exec.logs[0].name).to.equal(requestBody.exec.logs[0].name);
        expect(res.body.exec.logs[0].sha1).to.exist;
        expect(res.body.exec.logs[0].sha256).to.exist;
        expect(res.body.exec.logs[0].mime_type).to.exist;

        // Make sure file exists
        const filename = `${res.body.exec.logs[0].sha1}.gz`;
        const fileExists = fs.existsSync(path.join(absoluteFiledbPath, filename));

        expect(fileExists).to.equal(true, `Expected file: ${filename} to exist, it did not`);

        done();
      });
  });
  it('should accept POST with "++" in tcid', function (done) {
    const requestBody = {
      tcid: 'C++ heap',
      exec: {
        verdict: 'pass',
        duration: 1
      }
    };
    superagent.post(`${api}/results`)
      .set('authorization', authString)
      .send(requestBody)
      .end((error, res) => {
        expect(error).to.not.exist;
        expect(res).to.have.property('status', 200);
        done();
      });
  });

  it('should accept POST with log file that has no data', function (done) {
    const requestBody = JSON.parse(JSON.stringify(validResultBody));
    delete requestBody.exec.logs[0].data;

    superagent.post(`${api}/results`)
      .set('authorization', authString)
      .send(requestBody)
      .end((error, res) => {
        expect(error).to.not.exist;

        expect(res).to.have.property('status', 200);

        // Should have all the root level properties
        Object.keys(requestBody).forEach((key) => {
          expect(res.body).to.have.property(key);
        });

        // Check special cases, eg. logs
        expect(res.body.exec).to.have.property('logs').which.is.an('array');
        expect(res.body.exec.logs).to.have.lengthOf(1);

        // Check log sanity
        expect(res.body.exec.logs[0]).to.not.have.property('data');
        expect(res.body.exec.logs[0].name).to.equal(requestBody.exec.logs[0].name);
        expect(res.body.exec.logs[0].sha1).to.exist;
        expect(res.body.exec.logs[0].sha256).to.exist;
        expect(res.body.exec.logs[0].mime_type).to.exist;

        // Make sure file exists
        const filename = `${res.body.exec.logs[0].sha1}.gz`;
        const fileExists = fs.existsSync(path.join(absoluteFiledbPath, filename));

        expect(fileExists).to.equal(true, `Expected file: ${filename} to exist, it did not`);

        done();
      });
  });

  function acceptPostWithVerdict(verdict) {
    it(`should accept POST with verdict ${verdict}`, function (done) {
      const requestBody = JSON.parse(JSON.stringify(validResultBody));
      requestBody.exec.verdict = verdict;

      superagent.post(`${api}/results`)
        .set('authorization', authString)
        .send(requestBody)
        .end((error, res) => {
          expect(error, `Verdict [${verdict}]`).to.not.exist;

          expect(res).to.have.property('status', 200);

          // Should have all the root level properties
          Object.keys(requestBody).forEach((key) => {
            expect(res.body).to.have.property(key);
          });

          // Check special cases, eg. logs
          expect(res.body.exec).to.have.property('logs').which.is.an('array');
          expect(res.body.exec.logs).to.have.lengthOf(1);

          expect(res.body.exec).to.have.property('verdict', verdict);

          // Check log sanity
          expect(res.body.exec.logs[0]).to.not.have.property('data');
          expect(res.body.exec.logs[0].name).to.equal(requestBody.exec.logs[0].name);
          expect(res.body.exec.logs[0].sha1).to.exist;
          expect(res.body.exec.logs[0].sha256).to.exist;
          expect(res.body.exec.logs[0].mime_type).to.exist;

          // Make sure file exists
          const filename = `${res.body.exec.logs[0].sha1}.gz`;
          const fileExists = fs.existsSync(path.join(absoluteFiledbPath, filename));

          expect(fileExists).to.equal(true, `Expected file: ${filename} to exist, it did not`);

          done();
        });
    });
  }

  const verdicts = ['pass', 'fail', 'inconclusive', 'blocked', 'error', 'skip'];
  verdicts.forEach(acceptPostWithVerdict);
});
