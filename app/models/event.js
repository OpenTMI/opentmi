const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');

const {Schema} = mongoose;
const {Types} = Schema;
const {ObjectId, Mixed} = Types;


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
      Facilities.RESULT,
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
  static get RESULT() { return 'result'; }
  static get RESOURCE() { return 'resource'; }
  static get TESTCASE() { return 'testcase'; }
}

const EventSchema = new Schema({
  cre: {
    time: {type: Date, default: Date.now, index: true},
    date: {type: Date, default: Date.now}, // just backward compatible reason
    user: {type: ObjectId, ref: 'User'}
  },
  ref: {
    resource: {
      type: ObjectId,
      ref: 'Resource',
      required: function () {
        return this.priority.facility === Facilities.RESOURCE;
      }},
    result: {type: Types.ObjectId,
      ref: 'Result',
      required: function () {
        return this.priority.facility === Facilities.RESULT;
      }},
    testcase: {type: ObjectId,
      ref: 'Testcase',
      required: function () {
        return this.priority.facility === Facilities.TESTCASE;
      }},
    user: {type: ObjectId,
      ref: 'User',
      required: function () {
        return this.priority.facility === Facilities.USER;
      }}
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
  traceid: {type: String},
  id: {type: String}, // e.g. PID of the process
  msgid: {type: String, enum: MsgIds.list(), required: true}, // pre-defined ID's
  tag: {type: String},
  msg: {type: String},
  duration: {type: Number},
  spare: {type: Mixed}
});

// this avoids accidentally uploading duplicate events
EventSchema.index({msgid: 1, traceid: 1}, {
  unique: true,
  partialFilterExpression: {traceid: {$exists: true}}
});

// more speed for filterin e.g. flash failures
EventSchema.index({msgid: 1, 'priority.level': 1, 'cre.time': 1});


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
