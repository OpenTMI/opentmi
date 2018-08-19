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
  let createdEvents = [];
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

  afterEach(function () {
    const toBeDeleted = createdEvents;
    createdEvents = [];
    return Promise.each(toBeDeleted, deleteEvent);
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

  const createEvent = payload => superagent.post(api, payload)
    .set('authorization', authString)
    .end()
    .then((response) => {
      createdEvents.push(response.body._id);
      return response.body;
    });

  it('create events', function () {
    const payload = {
      priority: {
        level: 'info',
        facility: 'user'
      }
    };
    return createEvent(payload)
      .then((body) => {
        expect(body).to.have.property('priority');
      })
      .catch((error) => {
        throw new Error(error.response.body.error);
      });
  });
  it('find events', function () {
    const payload = {
      priority: {
        level: 'info',
        facility: 'user'
      }
    };
    function findEvents() {
      return superagent.get(`${apiV0}/events?priority.level=info`)
        .set('authorization', authString)
        .end()
        .then(response => response.body)
        .then((body) => {
          expect(body.length).to.be.equal(1);
          return body[0];
        })
        .then((body) => {
          expect(body.priority.level).to.be.equal('info');
        });
    }
    return createEvent(payload)
      .then(findEvents);
  });
  it('can calculate summary', function () {
    const resourceId = '5825bb7afe7545132c88c761';
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
      return createEvent(payload)
        .then((body) => {
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
    ])
      .then(getStatistics)
      .then((stats) => {
        expect(stats.count).to.be.equal(2);
        expect(stats.summary.allocations.count).to.be.equal(1);
        expect(stats.summary.allocations.time).to.be.equal(1);
      });
  });
  it('can calculate utilization', function () {
    const resourceId = '5825bb7afe7545132c88c761';
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
      return createEvent(payload)
        .then((body) => {
          expect(body.msgid).to.be.equal(msgid);
        });
    };
    const getUtilization = () =>
      superagent.get(`${apiV0}/resources/${resourceId}/utilization`)
        .set('authorization', authString)
        .end()
        .then(response => response.body);
    return Promise.mapSeries([
      create('1995-12-17T00:00:00', 'ALLOCATED'),
      create('1995-12-17T01:00:00', 'RELEASED'),
      create('1995-12-18T00:00:00', 'RELEASED')
    ], () => {})
      .then(getUtilization)
      .then((stats) => {
        expect(stats.count).to.be.equal(3);
        expect(stats.summary.allocations.count).to.be.equal(1);
        expect(stats.summary.allocations.time).to.be.equal(3600);
        expect(stats.summary.allocations.utilization >= 4).to.be.true;
        expect(stats.summary.allocations.utilization < 4.2).to.be.true;
      });
  });
});
