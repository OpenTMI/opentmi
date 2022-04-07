/**
 * Module dependencies
 */
const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');
// application modules
const logger = require('../tools/logger');
const {IsEmpty} = require('./plugins/isempty');


/* Implementation */
const {Schema} = mongoose;
const {Types} = Schema;
const {ObjectId} = Types;

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
 * plugins
 */
GroupSchema.plugin(QueryPlugin); // install QueryPlugin
GroupSchema.plugin(IsEmpty); // install IsEmpty

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Methods
 */
GroupSchema.methods.addUser = function addUser(email, next) {
  const self = this;
  const User = mongoose.model('User');
  User.findOne({email}, (error, user) => {
    if (error) {
      return next(error);
    }
    if (!user) {
      return next({message: 'user not found'});
    }
    if (user.groups.indexOf(self._id) >= 0) {
      logger.info({message: 'group already exists'});
    } else {
      user.groups.push(self._id);
      user.save();
    }
    if (self.users.indexOf(user._id) >= 0) {
      next({message: 'user has already in group'});
    } else {
      self.users.push(user._id);
      self.save(next);
    }

    return undefined;
  });
};

/* getUserGroups: function (user, cb) {
  return this.findOne({}, cb);
}, */

/**
 * Statics
 */

GroupSchema.static({
  getUsers(group, next) {
    this.findOne({name: group}).select('users').populate('users').exec(
      (error, docs) => {
        if (error) return next(error);
        if (docs) return next(error, docs.users);
        return next(error, docs);
      }
    );
  }
});

/**
 * Register
 */
const Group = mongoose.model('Group', GroupSchema);
module.exports = {Model: Group, Collection: 'Group'};
