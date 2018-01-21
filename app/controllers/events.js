/**
  Events Controller
*/

// native modules

// 3rd party modules

// own modules
const eventBus = require('../tools/eventBus');
const DefaultController = require('./');
const {calcUtilization, calcStatistics} = require('../tools/utilization');

class EventsController extends DefaultController {
  constructor() {
    super('Event');
    // create event based on internal events
    // this._linkEvents();
  }
  /*
  _linkEvents() {
    eventBus.on('result.new', this._resultNew.bind(this));
    eventBus.on('resource.new', this._resourceNew.bind(this));
    eventBus.on('resource.updated', this._resourceUpdated.bind(this));
  }
  */
  statistics(req, res) {
    const find = {
      ref: {
        resource: req.params.Resource
      },
      msgid: {
        $in: [
          'ALLOCATED',
          'RELEASED',
          'FLASHED',
          'ENTER_MAINTENANCE',
          'EXIT_MAINTENANCE'
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
      msgid: {$in: ['ALLOCATED', 'RELEASED']},
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
    // @todo
    // this.create()
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
