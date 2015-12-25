
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
var QueryPlugin = require('mongoose-query');
var bcrypt = require('bcryptjs');
var uuid = require('node-uuid');
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

   // 0 = normal user, 1 = admin
  account_level: {type: Number, default: 0},
  provider: {type: String},
  ldapId: {type: String},
  apikeys: [String]
})
.post('save', function(){
  if( this.isNew ) {
    db.groups.findOneAndUpdate(
      {'name': 'default'},
      {$push: {users: this._id}},
      function(error, doc){
      }
    );
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

/**
 * Validations
 */

var validatePresenceOf = function (value) {
  return value && value.length;
};

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
  var user = this;
  if (!user.isModified('password')) {
    return next();
  }
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(user.password, salt, function(err, hash) {
      user.password = hash;
      next();
    });
  });
});



/**
 * Methods
 */

UserSchema.methods = {

  /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} plainText
   * @return {Boolean}
   * @api public
   */
  comparePassword: function(password, done) {
    bcrypt.compare(password, this.password, function(err, isMatch) {
      done(err, isMatch);
    });
  },

  /**
   * Validation is not required if using OAuth
   */

  createApiKey: function(){
    var uuid = uuid.v1();
    this.apiKeys.append(uuid);
    this.save();
    return uuid
  },
  listApiKeys: function(){
    return this.apiKeys;
  },
  deleteApiKey: function(key, cb){
    if( this.apiKeys.indexOf(key) >= 0){
      this.update( { $pull: { apiKeys: key } } );
      this.save(cb);
    }
  },


  skipValidation: function(){
    return false;
  }

};


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

  getAllApiKeys: function(cb){
    this.query({type: 'distinct', f: 'apiKeys'}, cb);
  },

  generateApiKey: function(email, cb){
    this.findOne({email: email}, function(error, doc){
      cb(error, doc?doc.generateApiKey():null);
    });
  },

  apiKeyExists: function(apikey, cb){
    this.findOne({apiKeys: apikey}, cb);
  }
});

/**
 * Register
 */
mongoose.model('User', UserSchema);
