var mongoose = require('mongoose');
var LocalStrategy = require('passport-local').Strategy;


var User = mongoose.model('User');


var local = require('./passport/local');
/*var google = require('./passport/google');
var facebook = require('./passport/facebook');
var twitter = require('./passport/twitter');
var linkedin = require('./passport/linkedin');
var github = require('./passport/github');
*/


var Passport = function( passport, config ){
  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session.  Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing.
  passport.serializeUser(function(user, done) {
    console.log('login: '+user.username);
    user.increment();
    user.loggedIn = true;
    user.lastVisited = new Date();
    user.save();
    done(null, user._id);
  })

  passport.deserializeUser(function(id, done) {
    User.findOne({ _id: id }, function (err, user) {
      if(err) done(err);
      else {
        console.log('logout: '+user.username);
        user.update( {loggedIn: false}, done );
      }
    })
  })


  // use these strategies
  passport.use(local);
  /*passport.use(google);
  passport.use(facebook);
  passport.use(twitter);
  passport.use(linkedin);
  passport.use(github);*/

}

module.exports = Passport;