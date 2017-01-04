
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
var QueryPlugin = require('mongoose-query');
var bcrypt = require('bcryptjs');
var _ = require('lodash');

/* Implementation */   
var Schema = mongoose.Schema;
var Types = Schema.Types;
var ObjectId = Types.ObjectId;
var Mixed = Types.Mixed;
var Group = mongoose.model('Group');
var Schema = mongoose.Schema;

var validateEmail = function(email) {
    var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email)
};

/**
 * User schema
 */
var UserSchema = new Schema({
  name: { type: String },
  
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  displayName: String,
  picture: String,
  bitbucket: String,
  google: String,
  github: String,

  // statistics
  registered: { type: Date, default: Date.now },
  lastVisited: { type: Date, default: Date.now },
  loggedIn: { type: Boolean, default: false },

  groups: [ { type: ObjectId, ref: 'Group' } ],
  apikeys: [{ type: ObjectId, ref: 'ApiKey' } ]
})
.post('save', function(){
  if( this.isNew ) { 
  }
});

/**
 * User plugin
 */
//UserSchema.plugin(userPlugin, {});

/**
 * Query Plugin 
 */
UserSchema.plugin( QueryPlugin ); //install QueryPlugin

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
UserSchema.pre('save', function(next) {
  console.log('save-pre-hook-pwd')
  var self = this;
  if (!self.isModified('password')) {
    return next();
  }
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(self.password, salt, function(err, hash) {
      self.password = hash;
      next();
    });
  });
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
UserSchema.pre('remove', function(next) {
  var self = this;
  var Loan = mongoose.model('Loan');
  
  Loan.find({ loaner:self._id }, function(err, loans) {
	if (loans.length > 0) return next(new Error('cannot remove user because a loan with this user as the loaner exists'));
	next();
  });
});

/**
 * Methods
 */
UserSchema.methods.addToGroup = function (groupname, done) {
  var self = this;
  Group.findOne({ name: groupname }, function (error, group) {
    if (error) {
      return done(error);
    } else if (!group) {
      return done({ message: 'group not found' });
    } else if (_.find(group.users, function (user) { return user === self._id; })) {
      return done({ message: 'user belongs to the group already' });
    }

    self.groups.push(group._id);
    group.users.push(self._id);
    group.save();
    self.save(function (error, user) {
      if (error) {
        return done(error);
      }
      done(user);
    });
  });
};

UserSchema.methods.removeFromGroup = function(group, done) {
  var self = this;
  Group.findOne({name: group}, function(error, group){
      if( error ){
        return done(error);
      }
      if(!group){
        return done({message: 'group not found'});
      }
      self.groups = _.without(self.groups, group._id);
      group.users = _.without(group.users, self._id);
      group.save();
      self.save(function(error, user){
        if(error) {
          console.log('error');
          return done(error);
        }
        done(user);
      });
  });
}

/**
 * Authenticate - check if the passwords are the same
 *
 * @param {String} plainText
 * @return {Boolean}
 * @api public
 */
UserSchema.methods.comparePassword = function(password, done) {
  bcrypt.compare(password, this.password, function(err, isMatch) {
    done(err, isMatch);
  });
}

/**
 * Validation is not required if using OAuth
 */
UserSchema.methods.createApiKey = function(cb){
  var self = this;
  var ApiKey = mongoose.model('ApiKey');
  apikey = new ApiKey();
  apikey.save( function(doc){
    self.apikeys.push( doc._id );
    self.save(cb)
    cb(null, doc.key)
  })
},
UserSchema.methods.listApiKeys = function(){
  return this.apiKeys;
},
UserSchema.methods.deleteApiKey = function(key, cb){
  if( this.apiKeys.indexOf(key) >= 0){
    this.update( { $pull: { apiKeys: key } } );
    this.save(cb);
  }
}

UserSchema.methods.skipValidation = function(){
  return false;
}


/**
 * Statics
 */
UserSchema.static({
  /**
   * Load
   *
   * @param {Object} options
   * @param {Function} cb
   * @api private
   */

  load: function (options, cb) {
    options.select = options.select || 'name username';
    this.findOne(options.criteria)
      .select(options.select)
      .exec(cb);
  },

  admins: function (done) {
    var query = { 'account_level': 1 };
    this.find(query, done);
  },

  findByEmail: function(email, cb) {
    this.find({ email : email }, cb);
  },

  getApiKeys: function(user, cb){
    this.findOne({_id: user}).populate('apikeys').exec( 
      function(error, doc){
        if(error){
          return cb(error);
        }
        console.log(user);
        console.log(doc);
        cb(error, _.map(doc.apikeys, function(key){return key.key;}));
    });
  },

  generateApiKey: function(user, cb){
    this.findOne({_id: user}, function(error, doc){
      cb(error, doc?doc.generateApiKey():null);
    });
  }
});

/**
 * Register
 */
mongoose.model('User', UserSchema);
