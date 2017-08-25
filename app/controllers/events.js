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
    eventBus.on('resultNew', this._newResult.bind(this));
    eventBus.on('resourceNew', this._resourceNew.bind(this));
    eventBus.on('resourceUpdated', this._resourceUpdated.bind(this));
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
