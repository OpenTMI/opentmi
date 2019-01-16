/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */
const Promise = require('bluebird');
const sinon = require('sinon');
// Local components
const chai = require('../../chai');
const {setup, reset, teardown} = require('./../../utils/mongomock');
require('../../../app/models/event.js');
const CronJobsController = require('./../../../app/controllers/cronjobs.js');
const {newResponse, newRequest} = require('../helpers');


// Test variables
const {expect} = chai;
let controller = null;

describe('controllers/cronjobs.js', function () {
    // Create fresh DB
    before(setup);
    beforeEach(reset);
    after(teardown);

    it('constructor', function () {
        controller = new CronJobsController();
        expect(controller).to.exist; // eslint-disable-line no-unused-expressions
    });
    describe('operate', function () {
        describe('create', function () {
            it('success', function () {
                const res = newResponse();
                controller = new CronJobsController();
                const req = newRequest({
                    type: 'view',
                    cron: {
                        enabled: false,
                        interval: '* * * * * *'
                    },
                    view: {
                        view: 'test',
                        col: 'cronjobs',
                        aggregate: "[]"
                    }
                });
                return controller.create(req, res)
                    .then(() => {
                        expect(res.status.called).to.be.false;
                        expect(res.json.called).to.be.true;
                    });
            });
            it('schema fails', function () {
                const res = newResponse();
                controller = new CronJobsController();
                const req = newRequest({type: 'view'});
                return controller.create(req, res)
                    .then(() => {
                        expect(res.status.calledOnceWith(400)).to.be.true;
                        expect(res.json.called).to.be.true;
                    });
            });
        });
        describe('run', function () {
            it('view but aggregate fails', function () {
                this.timeout(5000);
                const res = newResponse();
                controller = new CronJobsController();
                const job = {
                    name: 'testing',
                    type: 'view',
                    cron: {
                        interval: '* * * * * *'
                    },
                    view: {
                        view: 'test',
                        col: 'cronjobs',
                        aggregate: "[{}]"
                    }
                };
                const req = newRequest(job);
                const _handleViewAggregate = sinon.spy(controller, '_handleViewAggregate');
                return controller.create(req, res)
                    .then(() => {
                        expect(res.status.called).to.be.false;
                        return Promise.delay(3000);
                    })
                    .then(() => {
                        expect(_handleViewAggregate.callCount).to.be.equal(1);
                        const doc = _handleViewAggregate.firstCall.args[0];
                        expect(doc).to.be.an('object');
                        const json = doc.toJSON()
                        expect(json).to.containSubset(job);
                        return controller.Model.findOne({_id: json._id})
                            .then((doc) => {
                                expect(doc.cron.enabled).to.be.undefined;
                                expect(doc.cron.lastError).to.be.an('string');
                            });
                    })
            });
        })
    });
});