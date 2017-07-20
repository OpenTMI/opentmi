
/*!
 * Module dependencies
 */
const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');
const logger = require('winston');

const Schema = mongoose.Schema;

/* Implementation */
const Types = Schema.Types;
const ObjectId = Types.ObjectId;

/**
 * Group schema
 */
const GroupSchema = new Schema({
  name: {type: String, required: true},
  users: [{type: ObjectId, ref: 'User'}],
  priority: {
    // max priority, 0=highest
    max: {type: Number, default: 3, min: 0, max: 5}
  },
  description: {type: String}
});

/**
 * Group plugin
 */
GroupSchema.plugin(QueryPlugin); // install QueryPlugin

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */
GroupSchema.methods.addUser = function addUser(pEmail, cb) {
  const self = this;
  const User = mongoose.model('User');
  User.findOne({pEmail}, (pError, pUser) => {
    if (pError) {
      return cb(pError);
    }
    if (!pUser) {
      return cb({message: 'user not found'});
    }
    if (pUser.groups.indexOf(self._id) >= 0) {
      logger.info({message: 'group already exists'});
    } else {
      pUser.groups.push(self._id);
      pUser.save();
    }
    if (self.users.indexOf(pUser._id) >= 0) {
      cb({message: 'user has already in group'});
    } else {
      self.users.push(pUser._id);
      self.save(cb);
    }

    return undefined;
  });
};

/* getUserGroups: function (user, cb) {
  return this.findOne({}, cb);
},*/

/**
 * Statics
 */

GroupSchema.static({
  getUsers(pGroup, cb) {
    this.findOne({name: pGroup}).select('users').populate('users').exec(
      (error, docs) => {
        if (error) return cb(error);
        if (docs) return cb(error, docs.users);
        return cb(error, docs);
      }
    );
  }
});

/**
 * Register
 */
const Group = mongoose.model('Group', GroupSchema);
module.exports = {Model: Group, Collection: 'Group'};
