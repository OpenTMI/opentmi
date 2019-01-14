const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');
const {cronPlugin} = require('mongoose-cron');


const {Schema} = mongoose;
const {Types} = Schema;
const {ObjectId, Mixed} = Types;


const CronJobSchema = new Schema({
  cre: {
    time: {type: Date, default: Date.now},
    user: {type: ObjectId, ref: 'User'}
  },
  mod: {
    time: {type: Date, default: Date.now},
    user: {type: ObjectId, ref: 'User'}
  },
  name: {type: String},
  type: {type: String, enum: ['view'], default: 'view'},
  view: {
    col: {type: String,
      required: function () {
        return this.type === 'view';
      }},
    pipeline: [{type: Mixed}]
  }
});

/**
 * Register plugins
 */
CronJobSchema.plugin(QueryPlugin); // install QueryPlugin

let interHandler = () => {};
const setHandler = (func) => {
  interHandler = func;
};
CronJobSchema.plugin(cronPlugin, {
  handler: doc => interHandler(doc), // triggered on job processing
  // When there are no jobs to process, wait 30s before
  // checking for processable jobs again (default: 0).
  idleDelay: 1000,
  // Wait 60s before processing the same job again in case
  // the job is a recurring job (default: 0).
  nextDelay: 1000
});

const Collection = 'cronjobs';
const Model = mongoose.model(Collection, CronJobSchema);

module.exports = {Model, Collection, Schema: CronJobSchema, setHandler};
