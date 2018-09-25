/**
 * Module dependencies
 */
const Promise = require('bluebird');
const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const invariant = require('invariant');
// application modules
const logger = require('../tools/logger');
const {IsEmpty} = require('./plugins/isempty');

/* Implementation */
const {Schema} = mongoose;
const {Types} = Schema;
const {ObjectId, Mixed} = Types;
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
  settings: {type: Mixed}
});


/**
 * Plugin
 */
UserSchema.plugin(QueryPlugin); // install QueryPlugin
UserSchema.plugin(IsEmpty); // install isEmpty

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
UserSchema.pre('save', function preSave() {
  if (!this.isModified('password')) {
    return Promise.resolve();
  }
  return this.saltPassword(this.password);
});


/**
 * Pre-remove hook
 */
UserSchema.pre('remove', function preRemove(next) {
  const Loan = mongoose.model('Loan');
  Loan.find({loaner: this._id}, (error, loans) => {
    if (loans.length > 0) {
      return next(new Error('cannot remove user because a loan with this user as the loaner exists'));
    }
    return next();
  });

  return undefined;
});

function requireGroup(groupName) {
  return group => Promise.try(() => {
    if (!group) {
      throw new Error(`group ${groupName} not found`);
    }
    return group;
  });
}

/**
 * Methods
 */
UserSchema.methods.saltPassword = function saltPassword(password) {
  return new Promise((resolve, reject) => {
    logger.verbose('Salting password..');
    bcrypt.genSalt(10, (saltError, salt) => {
      if (saltError) {
        return reject(saltError);
      }
      return bcrypt.hash(password, salt, (hashError, hash) => {
        if (saltError) {
          return reject(hashError);
        }
        this.password = hash;
        return resolve();
      });
    });
  });
};
UserSchema.methods.isAdmin = function isAdmin() {
  return this
    .populate('groups')
    .execPopulate()
    .then((populatedUser) => {
      const admins = populatedUser.groups.find(g => g.name === 'admins');
      return !!admins;
    });
};
UserSchema.methods.addToGroup = function addToGroup(groupName) {
  return Group.findOne({name: groupName})
    .then(requireGroup(groupName))
    .then((group) => {
      if (_.find(group.users, user => user === this._id)) {
        logger.silly(`user ${this._id} belongs to group ${groupName} already`);
        return Promise.resolve(this);
      }
      logger.silly(`adding user ${this._id} to group ${group._id}`);
      this.groups.push(group._id);
      group.users.push(this._id);
      return group.save()
        .then(() => this.save());
    });
};

UserSchema.methods.removeFromGroup = function removeFromGroup(groupName) {
  return Group.findOne({name: groupName})
    .then(requireGroup(groupName))
    .then((group) => {
      logger.silly(`remove group ${group._id} from user ${this._id}`);
      this.groups = _.without(this.groups, group._id);
      const editedGroup = group;
      editedGroup.users = _.without(group.users, this._id);
      return editedGroup.save()
        .then(() => this.save());
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
  invariant(this.password, 'User does not have local password');
  bcrypt.compare(password, this.password, next);
};

/**
 * Validation is not required if using OAuth
 */
UserSchema.methods.createApiKey = function createApiKey(cb) {
  const ApiKey = mongoose.model('ApiKey');
  const apikey = new ApiKey();
  apikey.save((doc) => {
    this.apikeys.push(doc._id);
    this.save(cb);
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
