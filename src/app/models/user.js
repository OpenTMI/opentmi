
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
var QueryPlugin = require('mongoose-query');
var bcrypt = require('bcryptjs'),
    SALT_WORK_FACTOR = 10;

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
  
  username: { type: String, required: true, unique: true },

  provider: {type: String},
  ldapId: {type: String},

  email: {
    type: String,
    trim: true,
    unique: true,
    required: 'Email address is required',
    validate: [validateEmail, 'Please fill a valid email address'],
  },

  registered: { type: Date, default: Date.now },
  lastVisited: { type: Date, default: Date.now },
  password: { type: String, required: true },
  loggedIn: { type: Boolean, default: false }
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

 UserSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});


/**
 * Methods
 */
UserSchema.methods.authenticate = function(candidatePassword) {
    return bcrypt.compareSync(candidatePassword, this.password);
};

/**
 * Statics
 */

UserSchema.static({

});

/**
 * Register
 */
mongoose.model('User', UserSchema);
