
/*!
 * Module dependencies
 */
const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const logger = require('winston');

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
  apikeys: [{type: ObjectId, ref: 'ApiKey'}]
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
UserSchema.pre('save', function preSave(pNext) {
  const self = this;
  if (!self.isModified('password')) {
    return pNext();
  }

  bcrypt.genSalt(10, (pSaltError, pSalt) => {
    bcrypt.hash(self.password, pSalt, (phashError, pHash) => {
      self.password = pHash;
      pNext();
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
})*/

/**
 * Pre-remove hook
 */
UserSchema.pre('remove', function preRemove(next) {
  const self = this;
  const Loan = mongoose.model('Loan');

  Loan.find({loaner: self._id}, (pError, pLoans) => {
    if (pLoans.length > 0) {
      return next(new Error('cannot remove user because a loan with this user as the loaner exists'));
    }

    return next();
  });

  return undefined;
});

/**
 * Methods
 */
UserSchema.methods.addToGroup = function addToGroup(pGroupName, pNext) {
  const self = this;
  Group.findOne({name: pGroupName}, (pError, pGroup) => {
    if (pError) {
      return pNext(pError);
    }
    if (!pGroup) {
      return pNext({message: 'group not found'});
    }
    if (_.find(pGroup.users, user => user === self._id)) {
      return pNext({message: 'user belongs to the group already'});
    }

    self.groups.push(pGroup._id);
    pGroup.users.push(self._id);
    pGroup.save();
    self.save((pSaveError, pUser) => {
      if (pSaveError) {
        return pNext(pSaveError);
      }

      return pNext(pUser);
    });

    return undefined;
  });
};

UserSchema.methods.removeFromGroup = function removeFromGroup(pGroupName, pNext) {
  const self = this;
  Group.findOne({name: pGroupName}, (pError, pGroup) => {
    const group = pGroup;

    if (pError) {
      return pNext(pError);
    }
    if (!pGroup) {
      return pNext({message: 'group not found'});
    }

    self.groups = _.without(self.groups, pGroup._id);
    group.users = _.without(pGroup.users, self._id);
    group.save();
    self.save((pSaveError, pUser) => {
      if (pSaveError) {
        logger.error(pError);
        return pNext(pSaveError);
      }

      return pNext(pUser);
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
UserSchema.methods.comparePassword = function comparePassword(pPassword, pNext) {
  bcrypt.compare(pPassword, this.password, (err, isMatch) => {
    pNext(err, isMatch);
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

UserSchema.methods.deleteApiKey = function deleteApiKey(pKey, cb) {
  if (this.apiKeys.indexOf(pKey) >= 0) {
    this.update({$pull: {apiKeys: pKey}});
    this.save(cb);
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
   * @param {Object} pOptions
   * @param {Function} cb
   * @api private
   */

  load(pOptions, cb) {
    const options = pOptions;
    options.select = pOptions.select || 'name username';
    this.findOne(pOptions.criteria)
      .select(pOptions.select)
      .exec(cb);
  },

  admins(pNext) {
    const query = {account_level: 1};
    this.find(query, pNext);
  },

  findByEmail(pEmail, cb) {
    this.find({email: pEmail}, cb);
  },

  getApiKeys(pUser, cb) {
    this.findOne({_id: pUser}).populate('apikeys').exec((pError, pDoc) => {
      if (pError) {
        return cb(pError);
      }

      logger.info(pUser);
      logger.info(pDoc);
      cb(pError, _.map(pDoc.apikeys, pKey => pKey.key));
    });

    return undefined;
  },

  generateApiKey(user, cb) {
    this.findOne({_id: user}, (error, doc) => {
      cb(error, doc ? doc.generateApiKey() : null);
    });
  }
});

/**
 * Register
 */
const User = mongoose.model('User', UserSchema);
module.exports = {Model: User, Collection: 'User'};
