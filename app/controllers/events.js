/**
  Events Controller
*/

// native modules

// 3rd party modules
const _ = require('lodash');

// own modules
const eventBus = require('../tools/eventBus');
const DefaultController = require('./');
const {calcUtilization, calcStatistics} = require('../tools/utilization');
const {MsgIds} = require('../models/event');

class EventsController extends DefaultController {
  constructor() {
    super('Event');
    // create event based on internal events
    // this._linkEvents();
  }
  /*
  _linkEvents() {
    // @todo
    eventBus.on('result.new', this._resultNew.bind(this));
    // eventBus.on('resource.new', this._resourceNew.bind(this));
    // eventBus.on('resource.updated', this._resourceUpdated.bind(this));
  }
  */
  statistics(req, res) {
    const find = {
      ref: {
        resource: req.params.Resource
      },
      msgid: {
        $in: [
          MsgIds.ALLOCATED,
          MsgIds.RELEASED,
          MsgIds.FLASHED,
          MsgIds.ENTER_MAINTENANCE,
          MsgIds.EXIT_MAINTENANCE
        ]
      },
      priority: {
        facility: 'resource'
      }
    };

    this.Model
      .find(find)
      .select('cre.date msgid priority.level')
      .exec()
      .then(calcStatistics)
      .then(res.json.bind(res))
      .catch(error => res.status(500).json(error));
  }
  utilization(req, res) {
    const find = {
      ref: {
        resource: req.params.Resource
      },
      msgid: {$in: [MsgIds.ALLOCATED, MsgIds.RELEASED]},
      priority: {
        level: 'info',
        facility: 'resource'
      }
    };
    this.Model
      .find(find)
      .select('cre.date')
      .exec()
      .then(calcUtilization)
      .then(res.json.bind(res))
      .catch(error => res.status(500).json(error));
  }
  /*
  _resultNew(bus, result) {
    const interestedVerdicts = ['inconclusive'];
    if (interestedVerdicts.indexOf(_.get(result, 'exec.verdict.final'))) {
      logger.debug('Got inconclusive test result');
      const event = {
        ref: {
          result: result._id,
        },
        priority: {
          level: 'warning',
          facility: 'testcase'
        },
        msg: _.get(result, 'exec.note')
      };
      this._create(event)
        .catch(logger.error);
    }
  }
  _resourceNew(bus, resource) {
    // @todo
    // this.create()
  }
  _resourceUpdated(bus, resource) {
    // @todo
    // this.create()
  }
  */
}

module.exports = EventsController;
