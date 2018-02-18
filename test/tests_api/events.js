/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const Promise = require('bluebird');
const superagentPromise = require('superagent-promise');
const superagent = superagentPromise(require('superagent'), Promise);
const {expect} = require('chai');
const logger = require('winston');

// Local components
const config = require('../../config');
const {createUserToken, apiV0} = require('./tools/helpers');

// Setup
logger.level = 'error';

// Test variables
const testUserId = '5825bb7afe7545132c88c761';

describe('Events', function () {
  let authString;
  const api = `${apiV0}/events`;
  const deleteEvent = eventId =>
    superagent.del(`${api}/${eventId}`)
      .set('authorization', authString)
      .end();

  // Create fresh DB
  before(function () {
    const tokenInput = {
      userId: testUserId,
      group: 'admins',
      groupId: '123',
      webtoken: config.get('webtoken')
    };
    authString = createUserToken(tokenInput).authString;
  });

  it('can not create event without mandatory properties', function () {
    const payload = {
      priority: {}
    };
    return superagent.post(api, payload)
      .set('authorization', authString)
      .end()
      .reflect()
      .then((promise) => {
        expect(promise.isRejected()).to.be.true;
      });
  });

  it('create events', function () {
    const payload = {
      priority: {
        level: 'info',
        facility: 'user'
      }
    };
    let eventId;
    return superagent.post(api, payload)
      .set('authorization', authString)
      .end()
      .then((event) => {
        eventId = event.body._id;
        expect(event.body).to.have.property('priority');
      })
      .catch((error) => {
        throw new Error(error.response.body.error);
      })
      .finally(() => deleteEvent(eventId));
  });
  it('can calculate summary', function () {
    const resourceId = '5825bb7afe7545132c88c761';
    const createdIds = [];
    const create = (timestamp, msgid) => {
      const payload = {
        priority: {
          level: 'info',
          facility: 'resource'
        },
        ref: {
          resource: resourceId
        },
        cre: {
          date: timestamp
        },
        msgid
      };
      return superagent.post(api, payload)
        .set('authorization', authString)
        .end()
        .then(response => response.body)
        .then((body) => {
          createdIds.push(body._id);
          expect(body.msgid).to.be.equal(msgid);
        });
    };
    const getStatistics = () =>
      superagent.get(`${apiV0}/resources/${resourceId}/statistics`)
        .set('authorization', authString)
        .end()
        .then(response => response.body);
    return Promise.all([
      create('1995-12-17T00:00:00', 'ALLOCATED'),
      create('1995-12-17T00:00:01', 'RELEASED')
    ]).then(getStatistics)
      .then((stats) => {
        expect(stats.count).to.be.equal(2);
        expect(stats.summary.allocations.count).to.be.equal(1);
        expect(stats.summary.allocations.time).to.be.equal(1);
      })
      .finally(() => Promise.each(createdIds, deleteEvent));
  });
  it('can calculate utilization', function () {
    const resourceId = '5825bb7afe7545132c88c761';
    const createdIds = [];
    const create = (timestamp, msgid) => {
      const payload = {
        priority: {
          level: 'info',
          facility: 'resource'
        },
        ref: {
          resource: resourceId
        },
        cre: {
          date: timestamp
        },
        msgid
      };
      return superagent.post(api, payload)
        .set('authorization', authString)
        .end()
        .then(response => response.body)
        .then((body) => {
          createdIds.push(body._id);
          expect(body.msgid).to.be.equal(msgid);
        });
    };
    const getUtilization = () =>
      superagent.get(`${apiV0}/resources/${resourceId}/utilization`)
        .set('authorization', authString)
        .end()
        .then(response => response.body);
    return Promise.all([
      create('1995-12-17T00:00:00', 'ALLOCATED'),
      create('1995-12-17T01:00:00', 'RELEASED'),
      create('1995-12-18T00:00:00', 'RELEASED')
    ]).then(getUtilization)
      .then((stats) => {
        expect(stats.count).to.be.equal(3);
        expect(stats.summary.allocations.count).to.be.equal(1);
        expect(stats.summary.allocations.time).to.be.equal(3600);
        expect(stats.summary.allocations.utilization >= 4).to.be.true;
        expect(stats.summary.allocations.utilization < 4.2).to.be.true;
      })
      .finally(() => Promise.each(createdIds, deleteEvent));
  });
});
