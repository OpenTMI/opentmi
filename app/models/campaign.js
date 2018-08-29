
/*!
 * Module dependencies
 */
const mongoose = require('mongoose');
// var userPlugin = require('mongoose-user');
const {Schema} = mongoose;
const QueryPlugin = require('mongoose-query');
const _ = require('lodash');

// implementation
const {Types} = Schema;
const {ObjectId} = Types;
/**
 * User schema
 */

const CampaignSchema = new Schema({
  name: {type: String, required: true},
  enable: {
    value: {type: Boolean, default: true},
    user: {type: String},
    time: {type: Date}
  },
  cre: {
    user: {type: String},
    time: {type: Date, default: Date.now}
  },
  mod: {
    user: {type: String},
    time: {type: Date, default: Date.now}
  },
  auth: {
    author: {type: String},
    group: {
      name: {type: String},
      write: {type: Boolean, default: true},
      exe: {type: Boolean, default: true}
    },
    other: {
      write: {type: Boolean, default: false},
      exe: {type: Boolean, default: false}
    }
  },
  tcs: {type: String, required: true},
  linkedCampaigns: [
    {type: ObjectId, ref: 'Campaign'}
  ]
});
/**
 * User plugin
 */
CampaignSchema.plugin(QueryPlugin); // install QueryPlugin

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */
CampaignSchema.methods.findTestcases = function findTestcases(query, cb) {
  if (!this.tcs) {
    cb('test_cases field missing!');
    return;
  }
  if (this.tcs[0] === '{') {
    _.extend(query, {q: this.tcs});
  } else {
    const parts = this.tcs.matches.split('&');
    for (let i = 0; i < parts.length; i += 1) {
      const x = parts[i].split('=');
      if (x.length === 2) {
        const q = {};
        q[x[0]] = x[1];
        _.extend(query, q);
      }
    }
  }

  Testcase = mongoose.model('Testcase'); // eslint-disable-line no-undef
  Testcase.query(query, cb); // eslint-disable-line no-undef
};

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */

CampaignSchema.method({});

/**
 * Statics
 */

CampaignSchema.static({
});

/**
 * Register
 */
const Campaign = mongoose.model('Campaign', CampaignSchema);
module.exports = {Model: Campaign, Collection: 'Campaign'};
