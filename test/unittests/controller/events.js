/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Local components
const chai = require('../../chai');
const {setup, reset, teardown} = require('./../../utils/mongomock');
require('../../../app/models/event.js');
const EventsController = require('./../../../app/controllers/events.js');
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
          })
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
          })
      });
    });
  });
});
