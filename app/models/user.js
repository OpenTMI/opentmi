
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
var QueryPlugin = require('mongoose-query');
var crypto = require('crypto');

var Schema = mongoose.Schema;

var oAuthTypes = [
  'github',
  'twitter',
  'facebook',
  'google',
  'linkedin',
  'ldap'
];

var validateEmail = function(email) {
    var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email)
};

/**
 * User schema
 */
var UserSchema = new Schema({
  name: { type: String },
  
  username: { type: String, required: true, unique: true },
  hashed_password: { type: String, required: true },
  salt: { type: String, default: '' },
  authToken: { type: String, default: '' },
  
  email: { type: String, trim: true },

  registered: { type: Date, default: Date.now },
  lastVisited: { type: Date, default: Date.now },
  loggedIn: { type: Boolean, default: false },

   // 0 = normal user, 1 = admin
  account_level: {type: Number, default: 0},
  provider: {type: String},
  ldapId: {type: String},

})
.post('save', function(){
  if( this.isNew ) {
    db.groups.findOneAndUpdate(
      {'name': 'default'},
      {$push: {users: this.username}},
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

UserSchema
  .virtual('password')
  .set(function(password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashed_password = this.encryptPassword(password);
  })
  .get(function() { return this._password });


/**
 * Validations
 */

var validatePresenceOf = function (value) {
  return value && value.length;
};

// the below 5 validations only apply if you are signing up traditionally

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

UserSchema.path('hashed_password').validate(function (hashed_password) {
  if (this.skipValidation()) return true;
  return hashed_password.length;
}, 'Password cannot be blank');


/**
 * Pre-save hook
 */

UserSchema.pre('save', function(next) {
  if (!this.isNew) return next();

  if (!validatePresenceOf(this.password) && !this.skipValidation()) {
    next(new Error('Invalid password'));
  } else {
    next();
  }
})

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

  authenticate: function (plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  },

  /**
   * Make salt
   *
   * @return {String}
   * @api public
   */

  makeSalt: function () {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  },

  /**
   * Encrypt password
   *
   * @param {String} password
   * @return {String}
   * @api public
   */

  encryptPassword: function (password) {
    if (!password) return '';
    try {
      return crypto
        .createHmac('sha1', this.salt)
        .update(password)
        .digest('hex');
    } catch (err) {
      return '';
    }
  },

  /**
   * Validation is not required if using OAuth
   */

  skipValidation: function() {
    return ~oAuthTypes.indexOf(this.provider);
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
  }
});

/**
 * Register
 */
mongoose.model('User', UserSchema);
