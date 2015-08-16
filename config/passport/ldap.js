/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var LdapStrategy = require('passport-ldapauth').Strategy;
var config = require('config');
var User = mongoose.model('User');

/**
 * Expose
 */
//https://www.npmjs.com/package/passport-ldapauth
module.exports = new LdapStrategy({
    server: config.ldap
  },
  function(accessToken, refreshToken, profile, done) {
    var criteria = { 'ldapId': profile.id } ;
    User.findOne(criteria, function (err, user) {
      if (err) return done(err);
      if (!user) {
        console.log(user);
        user = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          username: profile.username,
          provider: 'ldap',
          ldap: profile._json
        });
        user.save(function (err) {
          if (err) console.log(err);
          return done(err, user);
        });
      } else {
        return done(err, user);
      }
    });
  }
);
