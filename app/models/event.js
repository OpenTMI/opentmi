const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');

const Schema = mongoose.Schema;
const Types = Schema.Types;
const ObjectId = Types.ObjectId;

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
  priority_: {
    level: {
      type: String,
      required: true,
      enum: [
        'emerg',
        'alert',
        'crit',
        'err',
        'warning',
        'notice',
        'info',
        'debug'
      ]
    },
    facility: {
      type: String,
      required: true,
      enum: [
        'auth',
        'cron',
        'daemon',
        'mail',
        'news',
        'syslog',
        'user',
        'resource'
      ]
    }
  },
  id: {type: String}, // PID of the
  msgid: {type: String, enum: []}, //
  tag: {type: String},
  msg: {type: String}
});

EventSchema.virtual('priority').get(() => `${this.priority.facility}.${this.priority.level}`);

/**
 * Register plugins
 */
EventSchema.plugin(QueryPlugin); // install QueryPlugin

const Event = mongoose.model('Event', EventSchema);
module.exports = {Model: Event, Collection: 'Event'};
