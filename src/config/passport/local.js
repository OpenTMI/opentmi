
/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var LocalStrategy = require('passport-local').Strategy;
var User = mongoose.model('User');

/**
 * Expose
 */

module.exports = new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  },
  function(username, password, done) {
    User.findOne({username: username}).select('username password').exec( function (err, user) {
      if (err) return done(err);
      if (!user) {
        user = new User({
          username: username,
          password: password
        });
        user.save(function (err) {
          if (err) console.log(err);
          return done(err, user);
        });
        //return done(null, false, { message: 'Unknown user' });
      }
      if (!user.authenticate(password)) {
        return done(null, false, { message: 'Invalid password' });
      }
      return done(null, user);
    });
  }
);
