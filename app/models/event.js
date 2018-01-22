const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');

const Schema = mongoose.Schema;
const Types = Schema.Types;
const ObjectId = Types.ObjectId;


class MsgIds {
  static list() {
    return [
      MsgIds.ALLOCATED,
      MsgIds.RELEASED,
      MsgIds.ENTER_MAINTENANCE,
      MsgIds.EXIT_MAINTENANCE,
      MsgIds.CREATED,
      MsgIds.DELETED,
      MsgIds.FLASHED
    ];
  }
  static get ALLOCATED() { return 'ALLOCATED'; }
  static get RELEASED() { return 'RELEASED'; }
  static get ENTER_MAINTENANCE() { return 'ENTER_MAINTENANCE'; }
  static get EXIT_MAINTENANCE() { return 'EXIT_MAINTENANCE'; }
  static get CREATED() { return 'CREATED'; }
  static get DELETED() { return 'DELETED'; }
  static get FLASHED() { return 'FLASHED'; }
}

class Priorities {
  static list() {
    return [
      Priorities.EMERG,
      Priorities.ALERT,
      Priorities.CRIT,
      Priorities.ERR,
      Priorities.WARNING,
      Priorities.NOTICE,
      Priorities.INFO,
      Priorities.DEBUG
    ];
  }
  static get EMERG() { return 'emerg'; }
  static get ALERT() { return 'alert'; }
  static get CRIT() { return 'crit'; }
  static get ERR() { return 'err'; }
  static get WARNING() { return 'warning'; }
  static get NOTICE() { return 'notice'; }
  static get INFO() { return 'info'; }
  static get DEBUG() { return 'debug'; }
}
class Facilities {
  static list() {
    return [
      Facilities.AUTH,
      Facilities.CRON,
      Facilities.DAEMON,
      Facilities.MAIL,
      Facilities.NEWS,
      Facilities.SYSLOG,
      Facilities.USER,
      Facilities.RESOURCE,
      Facilities.TESTCASE
    ];
  }
  static get AUTH() { return 'auth'; }
  static get CRON() { return 'cron'; }
  static get DAEMON() { return 'daemon'; }
  static get MAIL() { return 'mail'; }
  static get NEWS() { return 'news'; }
  static get SYSLOG() { return 'syslog'; }
  static get USER() { return 'user'; }
  static get RESOURCE() { return 'resource'; }
  static get TESTCASE() { return 'testcase'; }
}

const EventSchema = new Schema({
  cre: {
    date: {type: Date, default: Date.now},
    user: {type: ObjectId, ref: 'User'}
  },
  ref: {
    resource: {type: ObjectId, ref: 'Resource'},
    result: {type: Types.ObjectId, ref: 'Result'},
    testcase: {type: ObjectId, ref: 'Testcase'}
  },
  priority: {
    level: {
      type: String,
      required: true,
      enum: Priorities.list()
    },
    facility: {
      type: String,
      required: true,
      enum: Facilities.list()
    }
  },
  id: {type: String}, // PID of the process
  msgid: {type: String, enum: MsgIds.list()}, // pre-defined ID's
  tag: {type: String},
  msg: {type: String}
});

EventSchema.virtual('priorityStr')
  .get(function getPriority() {
    return `${this.priority.facility}.${this.priority.level}`;
  });

/**
 * Register plugins
 */
EventSchema.plugin(QueryPlugin); // install QueryPlugin

const Model = mongoose.model('Event', EventSchema);

module.exports = {
  Model,
  Collection: 'Event',
  MsgIds,
  Priorities,
  Facilities
};
