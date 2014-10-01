var express = require('express');

var compression = require('compression');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

/**
 * Expose
 */

module.exports = function (app, passport) {
  
  // Compression middleware (should be placed before express.static)
  app.use(compression({
    threshold: 512
  }));
  
  app.use( express.static('./public') );
  
  // bodyParser should be above methodOverride
  app.use(bodyParser());
  app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      var method = req.body._method;
      delete req.body._method;
      return method;
    }
  }));

  // cookieParser should be above session
  app.use(cookieParser());
  app.use(cookieSession({ secret: 'secret' }));
  /*app.use(session({
    secret: pkg.name,
    store: new mongoStore({
      url: config.db,
      collection : 'sessions'
    })
  }));*/

  // use passport session
  app.use(passport.initialize());
  app.use(passport.session());
  
  
  
}