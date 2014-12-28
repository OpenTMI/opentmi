
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
    var createNewUsers = false;
    var options = {
      criteria: { username: username },
      select: 'name username email hashed_password salt'
    };
    User.load(options, function (err, user) {
      if (err) return done(err);
      if (!user) {
        if( createNewUsers ) {
          user = new User({
            username: username,
            password: password
          });
          user.save(function (err) {
            if (err) console.log(err);
            return done(err, user);
          });
        }
        else {
          return done(null, false, { message: 'Unknown user' });
        }
      }
      else {
        if (!user.authenticate(password)) {
          return done(null, false, { message: 'Invalid password' });
        }
        return done(null, user);
      }
    });
  }
);
