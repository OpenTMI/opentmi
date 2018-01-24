/**
  Events Controller
*/

// native modules

// 3rd party modules
const _ = require('lodash');

// own modules
// const eventBus = require('../tools/eventBus');
const DefaultController = require('./');
const {Utilization} = require('../tools/utilization');
const {MsgIds} = require('../models/event');
const logger = require('../tools/logger');


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

  static redirectRef(req, res) {
    const iteratee = (path) => {
      const ref = _.get(req.Event, `ref.${path}`);
      if (ref) {
        res.redirect(`/api/v0/${path}s/${ref}`);
        return true;
      }
      return false;
    };
    const found = _.find(['resource', 'result', 'testcase'], iteratee);
    if (!found) {
      res.status(404).json({message: 'reference object not found'});
    }
  }
  statistics(req, res) {
    const find = {
      'ref.resource': req.params.Resource,
      msgid: {
        $in: [
          MsgIds.ALLOCATED,
          MsgIds.RELEASED,
          MsgIds.FLASHED,
          MsgIds.ENTER_MAINTENANCE,
          MsgIds.EXIT_MAINTENANCE
        ]
      },
      'priority.facility': 'resource'
    };
    const utilization = new Utilization();
    this.Model
      .find(find)
      .select('cre.date msgid priority.level')
      .cursor()
      .on('data', utilization.push.bind(utilization))
      .on('error', (err) => { logger.error(err); })
      .on('end', () => res.json(utilization.summary));
  }
  utilization(req, res) {
    const find = {
      'ref.resource': req.params.Resource,
      msgid: {$in: [MsgIds.ALLOCATED, MsgIds.RELEASED]},
      'priority.level': 'info',
      'priority.facility': 'resource'
    };
    const utilization = new Utilization();
    this.Model
      .find(find)
      .select('cre.date')
      .cursor()
      .on('data', utilization.push.bind(utilization))
      .on('error', err => logger.error(err))
      .on('end', () => {
        utilization.calculate()
          .then(res.json.bind(res))
          .catch((error) => {
            res.status(404).json({message: error.message, error: error});
          });
      });
  }
  resourceEvents(req, res) {
    const find = {
      'ref.resource': req.params.Resource
    };
    this.Model
      .find(find)
      .exec()
      .then((events) => { res.json(events); })
      .catch((error) => {
        logger.warn(error);
        res
          .status(500)
          .json({message: error.message, error: error});
      });
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
