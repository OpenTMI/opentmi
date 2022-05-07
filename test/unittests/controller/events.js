/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Local components
const chai = require('../../chai');
const {setup, reset, teardown} = require('../../utils/mongomock');
require('../../../app/models/event.js');
const EventsController = require('../../../app/controllers/events.js');
const {newResponse, newRequest} = require('../helpers');

// Test variables
const {expect} = chai;
let controller = null;

describe('controllers/events.js', function () {
  // Create fresh DB
  before(setup);
  beforeEach(reset);

  after(teardown);

  it('constructor', function () {
    controller = new EventsController();
    expect(controller).to.exist; // eslint-disable-line no-unused-expressions
  });
  describe('operate', function () {
    let res;
    beforeEach(function () {
      res = newResponse();
    });

    describe('create resource event', function () {
      it('success', function () {
        controller = new EventsController();
        const req = newRequest({
          priority: {
            level: 'info',
            facility: 'resource'
          },
          'ref.resource': '5c10f57f35e9e38db25c0476'
        });
        return controller.create(req, res)
          .then(() => {
            expect(res.status.called).to.be.false;
          });
      });
      it('require ref', function () {
        controller = new EventsController();
        const req = newRequest({
          priority: {
            level: 'info',
            facility: 'resource'
          }
        });
        return controller.create(req, res)
          .then(() => {
            expect(res.status.calledOnceWith(400)).to.be.true;
          });
      });
    });
    describe('resourceEvents', function () {
      it('list', function () {
        controller = new EventsController();
        const req = newRequest({}, {Resource: '5c10f57f35e9e38db25c0476'});
        req.Resource = {_id: '5c10f57f35e9e38db25c0476'};
        return controller.resourceEvents(req, res)
          .then(() => {
            expect(res.json.calledWith([])).to.be.true;
          });
      });
      it('allow to use hw.sn', function () {
        controller = new EventsController();
        const req = newRequest({}, {Resource: '12'});
        req.Resource = {_id: '5c10f57f35e9e38db25c0476', hw: {sn: '12'}};
        return controller.resourceEvents(req, res)
          .then(() => {
            expect(res.json.calledWith([])).to.be.true;
          });
      });
    });
    describe('redirectRef', function () {
      it('found', function () {
        const req = newRequest({}, {Resource: 'abc'});
        req.Event = {ref: {resource: 'abc'}};
        EventsController.redirectRef(req, res);
        expect(res.redirect.calledWith(`/api/v0/resources/${req.params.Resource}`)).to.be.true;
      });
      it('not found', function () {
        const req = newRequest({}, {Resource: 'abc'});
        EventsController.redirectRef(req, res);
        expect(res.status.calledWith(404)).to.be.true;
      });
    });
  });
});
