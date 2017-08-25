/**
  Events Controller
*/

// native modules

// 3rd party modules

// own modules
const eventBus = require('../tools/eventBus');
const DefaultController = require('./');

class EventsController extends DefaultController {
  constructor() {
    super('Event');
    // create event based on internal events
    eventBus.on('resultNew', this._resultNew.bind(this));
    eventBus.on('resourceNew', this._resourceNew.bind(this));
    eventBus.on('resourceUpdated', this._resourceUpdated.bind(this));
  }
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
          'MAINTENANCE',
          'UNMAINTENANCE'
        ]
      },
      priority: {
        facility: 'resource'
      }
    };
    /* @todo calculcate statistics: could be done even in DB side
    - total alloc durations
    - total amount of FLASHED
    - total maintenance duration
    */
    const calcStatistics = data => Promise.resolve({count: data.length});
    this.Event
      .find(find)
      .select('cre.date msgid')
      .exec()
      .then(calcStatistics)
      .then(res.json)
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
    // @todo calculcate utilization - could be done even in DB side:
    // how many seconds per day device has been allocated
    // -> based on that information we can calculate percentual values
    const calcUtilization = data => Promise.resolve({count: data.length});
    this.Event
      .find(find)
      .select('cre.date')
      .exec()
      .then(calcUtilization)
      .then(res.json)
      .catch(error => res.status(500).json(error));
  }
  _resultNew(result) {
    // @todo
    // this.create()
  }
  _resourceNew(resource) {
    // @todo
    // this.create()
  }
  _resourceUpdated(resource) {
    // @todo
    // this.create()
  }
}


module.exports = EventsController;
