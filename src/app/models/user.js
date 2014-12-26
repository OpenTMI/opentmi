
/*!
 * Module dependencies
 */

var mongoose = require('mongoose');
//var userPlugin = require('mongoose-user');
var Schema = mongoose.Schema;
var QueryPlugin = require('mongoose-query');
/**
 * User schema
 */

var UserSchema = new Schema({
  name: { type: String, default: '' },
  registered: { type: Date, default: Date.now },
  lastVisited: { type: Date, default: Date.now },
  email: { type: String, default: '' },
  hashed_password: { type: String, default: '' },
  salt: { type: String, default: '' }
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
 * Methods
 */

UserSchema.method({

});

/**
 * Statics
 */

UserSchema.static({

});

/**
 * Register
 */
mongoose.model('User', UserSchema);
