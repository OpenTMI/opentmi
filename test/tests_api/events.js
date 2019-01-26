/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const Promise = require('bluebird');
const superagentPromise = require('superagent-promise');
const superagent = superagentPromise(require('superagent'), Promise);
const {expect} = require('chai');
const _ = require('lodash');
const logger = require('winston');

// Local components
const config = require('../../app/tools/config');
const {createUserToken, apiV0, testUserId} = require('./tools/helpers');

// Setup
logger.level = 'error';


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
      webtoken: config.get('webtoken')
    };
    authString = createUserToken(tokenInput).authString;
  });

  afterEach(function () {
    const toBeDeleted = createdEvents;
    createdEvents = [];
    return Promise.each(toBeDeleted, deleteEvent);
  });


  const createEvent = payload => superagent.post(api, payload)
    .set('authorization', authString)
    .end()
    .then((response) => {
      createdEvents.push(response.body._id);
      return response.body;
    })
    .catch((error) => {
      throw new Error(_.get(error, 'response.body.error', error));
    });

  describe('create events', function () {
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
    it('create info events', function () {
      const payload = {
        priority: {
          level: 'info',
          facility: 'user'
        },
        ref: {
          user: '5c10f57f35e9e38db25c0476'
        }
      };
      return createEvent(payload)
        .then((body) => {
          expect(body).to.have.property('priority');
        });
    });
    it('create resource events', function () {
      const payload = {
        priority: {
          level: 'info',
          facility: 'resource'
        },
        ref: {
          resource: '5c10f57f35e9e38db25c0476'
        },
        duration: 1,
        spare: 'abc'
      };
      return createEvent(payload)
        .then((body) => {
          expect(body).to.deep.include(payload);
        });
    });
  });
  it('find events', function () {
    const payload = {
      priority: {
        level: 'info',
        facility: 'user'
      },
      ref: {
        user: '5c10f57f35e9e38db25c0476'
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
          time: timestamp
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
    const create = (timestamp, msgid, traceid) => {
      const payload = {
        priority: {
          level: 'info',
          facility: 'resource'
        },
        ref: {
          resource: resourceId
        },
        cre: {
          time: timestamp
        },
        msgid,
        traceid
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
      create('1995-12-17T00:00:00', 'ALLOCATED', '123'),
      create('1995-12-17T01:00:00', 'RELEASED', '123'),
      create('1995-12-17T01:00:00', 'RELEASED', '123')
        .then(() => {
          throw Error();
        })
        .catch((error) => {
          expect(error).to.be.ok;
        }),
      create('1995-12-18T00:00:00', 'ALLOCATED', '1234')
    ], () => {})
      .then(getUtilization)
      .then((stats) => {
        expect(stats.count).to.be.equal(3);
        expect(stats.summary.allocations.count).to.be.equal(2);
        expect(stats.summary.allocations.time).to.be.equal(3600);
        expect(stats.summary.allocations.utilization).to.be.at.least(4);
        expect(stats.summary.allocations.utilization).to.be.below(4.2);
      });
  });
});
