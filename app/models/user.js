
/*!
 * Module dependencies
 */
const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const logger = require('../tools/logger');

/* Implementation */
const Schema = mongoose.Schema;
const Types = Schema.Types;
const ObjectId = Types.ObjectId;
const Group = mongoose.model('Group');

function validateEmail(email) { // eslint-disable-line no-unused-vars
  const regExp = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // eslint-disable-line
  return regExp.test(email);
}

/**
 * User schema
 */
const UserSchema = new Schema({
  name: {type: String},

  email: {type: String, unique: true, lowercase: true},
  password: {type: String, select: false},
  displayName: String,
  picture: String,
  bitbucket: String,
  google: String,
  github: String,

  // statistics
  registered: {type: Date, default: Date.now},
  lastVisited: {type: Date, default: Date.now},
  loggedIn: {type: Boolean, default: false},
  groups: [{type: ObjectId, ref: 'Group'}],
  apikeys: [{type: ObjectId, ref: 'ApiKey'}],
  settings: {type: mongoose.Schema.Types.Mixed}
}).post('save', () => {
  // if (this.isNew) { }
});

/**
 * User plugin
 */
// UserSchema.plugin(userPlugin, {});

/**
 * Query Plugin
 */
UserSchema.plugin(QueryPlugin); // install QueryPlugin

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */
// the below 5 validations only apply if you are signing up traditionally
/*
UserSchema.path('name').validate(function (name) {
  if (this.skipValidation()) return true;
  return name.length;
}, 'Name cannot be blank');
// validate email format
UserSchema.path('email').validate(function (email) {
  if (this.skipValidation()) return true;
  return validateEmail(email);
}, 'Please fill a valid email address');
// validate if email already exists
UserSchema.path('email').validate(function (email, fn) {
  var User = mongoose.model('User');
  if (this.skipValidation()) fn(true);

  // Check only when it is a new user or when email field is modified
  if (this.isNew || this.isModified('email')) {
    User.find({ email: email }).exec(function (err, users) {
      fn(!err && users.length === 0);
    });
  } else fn(true);
}, 'Email already exists');

UserSchema.path('username').validate(function (username) {
  if (this.skipValidation()) return true;
  return username.length;
}, 'Username cannot be blank');
*/

/**
 * Pre-save hook
 */
UserSchema.pre('save', function preSave(next) {
  const self = this;
  if (!self.isModified('password')) {
    return next();
  }

  bcrypt.genSalt(10, (saltError, salt) => {
    bcrypt.hash(self.password, salt, (hashError, hash) => {
      self.password = hash;
      next();
    });
  });

  return undefined;
});
/*
UserSchema.pre('save', function(next){
  console.log('save-pre-hook')
  if( this.isNew ){
    var self=this,
        groups = this.groups;
    this.groups = [];
    if( groups ){
      var self = this;
      groups.forEach( function(group){
        self.addToGroup(group);
      });
      next();
    }
  }
}) */

/**
 * Pre-remove hook
 */
UserSchema.pre('remove', function preRemove(next) {
  const self = this;
  const Loan = mongoose.model('Loan');

  Loan.find({loaner: self._id}, (error, loans) => {
    if (loans.length > 0) {
      return next(new Error('cannot remove user because a loan with this user as the loaner exists'));
    }

    return next();
  });

  return undefined;
});

/**
 * Methods
 */
UserSchema.methods.addToGroup = function addToGroup(groupName, next) {
  const self = this;
  Group.findOne({name: groupName}, (error, group) => {
    if (error) {
      return next(error);
    }
    if (!group) {
      return next({message: 'group not found'});
    }
    if (_.find(group.users, user => user === self._id)) {
      return next({message: 'user belongs to the group already'});
    }

    self.groups.push(group._id);
    group.users.push(self._id);
    group.save();
    self.save((saveError, user) => {
      if (saveError) {
        return next(saveError);
      }

      return next(user);
    });

    return undefined;
  });
};

UserSchema.methods.removeFromGroup = function removeFromGroup(groupName, next) {
  const self = this;
  Group.findOne({name: groupName}, (error, group) => {
    if (error) {
      return next(error);
    }
    if (!group) {
      return next({message: 'group not found'});
    }

    self.groups = _.without(self.groups, group._id);

    const editedGroup = group;
    editedGroup.users = _.without(group.users, self._id);
    editedGroup.save();
    self.save((saveError, user) => {
      if (saveError) {
        logger.error(error);
        return next(saveError);
      }

      return next(user);
    });

    return undefined;
  });
};

/**
 * Authenticate - check if the passwords are the same
 *
 * @param {String} plainText
 * @return {Boolean}
 * @api public
 */
UserSchema.methods.comparePassword = function comparePassword(password, next) {
  bcrypt.compare(password, this.password, (error, isMatch) => {
    next(error, isMatch);
  });
};

/**
 * Validation is not required if using OAuth
 */
UserSchema.methods.createApiKey = function createApiKey(cb) {
  const self = this;
  const ApiKey = mongoose.model('ApiKey');
  const apikey = new ApiKey();
  apikey.save((doc) => {
    self.apikeys.push(doc._id);
    self.save(cb);
    cb(null, doc.key); // Callback gets called twice, usually not intended
  });
};

UserSchema.methods.listApiKeys = function listApiKeys() {
  return this.apiKeys;
};

UserSchema.methods.deleteApiKey = function deleteApiKey(key, next) {
  if (this.apiKeys.indexOf(key) >= 0) {
    this.update({$pull: {apiKeys: key}});
    this.save(next);
  }
};

UserSchema.methods.skipValidation = () => false;

/**
 * Statics
 */
UserSchema.static({
  /**
   * Load
   *
   * @param {Object} options
   * @param {Function} next
   * @api private
   */

  load(options, next) {
    const editedOptions = options;
    editedOptions.select = options.select || 'name username';
    this.findOne(editedOptions.criteria)
      .select(editedOptions.select)
      .exec(next);
  },

  admins(next) {
    const query = {account_level: 1};
    this.find(query, next);
  },

  findByEmail(email, next) {
    this.find({email: email}, next);
  },

  getApiKeys(user, next) {
    this.findOne({_id: user}).populate('apikeys').exec((error, doc) => {
      if (error) {
        return next(error);
      }

      logger.info(user);
      logger.info(doc);
      next(error, _.map(doc.apikeys, key => key.key));

      return undefined;
    });
  },

  generateApiKey(user, next) {
    this.findOne({_id: user}, (error, doc) => {
      next(error, doc ? doc.generateApiKey() : null);
    });
  }
});

/**
 * Register
 */
const User = mongoose.model('User', UserSchema);
module.exports = {Model: User, Collection: 'User'};
