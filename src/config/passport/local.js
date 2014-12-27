
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
    console.log('logining..');
    User.findOne({username: username}).select('username password').exec( function (err, user) {
      if (err) return done(err);
      if (!user) {
        console.log('')
        return done(null, false, { message: 'Unknown user' });
      }
      if (!user.authenticate(password)) {
        return done(null, false, { message: 'Invalid password' });
      }
      user.loggedIn = true;
      user.save( function(error, user){
        return done(null, user);
      });
    });
  }
);
