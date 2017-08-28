/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const superagent = require('superagent');
const chai = require('chai');
const logger = require('winston');

// Setup
logger.level = 'error';

// Test variables
const expect = chai.expect;
const api = 'http://localhost:3000/api/v0';

describe('Resource', function () {
  let resourceId;
  it('add resource', function (done) {
    const body = {
      name: 'dev1',
      type: 'dut',
      hw: {
        sn: 'SerialNumber'
      }
    };

    superagent.post(`${api}/resources`)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        if (res.status === 300) {
          logger.warn('Seems that your DB is not clean!');
          process.exit(1);
        }
        expect(res).to.have.property('status', 200);
        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('type');
        expect(res.body).to.have.property('id');
        expect(res.body.name).to.equal('dev1');
        expect(res.body.type).to.equal('dut');
        resourceId = res.body.id;
        done();
      });
  });

  it('get resource', function (done) {
    superagent.get(`${api}/resources/${resourceId}`)
      .type('json')
      .end(function (error, res) {
        expect(error).to.equal(null);
        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('type');
        expect(res.body).to.have.property('id');
        expect(res.body.name).to.equal('dev1');
        expect(res.body.type).to.equal('dut');
        done();
      });
  });

  it('update resource', function (done) {
    const body = {'status.value': 'active'};
    superagent.put(`${api}/resources/${resourceId}`)
      .send(body)
      .end(function (error, res) {
        expect(error).to.equal(null);

        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        expect(res.body).to.have.property('status');
        expect(res.body.status).to.have.property('value');
        expect(res.body.status.value).to.be.equal('active');
        done();
      });
  });

  it('remove resource', function (done) {
    superagent.delete(`${api}/resources/${resourceId}`)
      .end(function (error, res) {
        expect(error).to.equal(null);

        expect(res).to.be.a('Object');
        expect(res).to.have.property('status', 200);
        resourceId = null;
        done();
      });
  });
});
