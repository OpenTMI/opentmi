
/* 3rd party libraries */
var express = require('express');
// Express addons
var session = require('express-session');
var compression = require('compression');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var csrf = require('csurf');
var cors = require('cors');
var multer = require('multer');

var mongoStore = require('connect-mongo')(session);

var winston = require('winston');

/* Project libraries */
var config = require('./config');
var pkg = require('../package.json');
var env = process.env.NODE_ENV || 'development';



/**
 * Expose
 */
module.exports = function (app, passport) {
  
  // Compression middleware (should be placed before express.static)
  app.use(compression({
    threshold: 512
  }));
  
  app.use( express.static( config.root + '/public') );
  
  
  var log;
  if (env !== 'development') {
    log = {
      stream: {
        write: function (message, encoding) {
          winston.info(message);
        }
      }
    };
  } else {
    log = 'dev'; //'combined' - standard apache format
  }
  
  // Don't log during tests
  // Logging middleware
  //if (env !== 'test') 
    app.use(morgan(log));
  
  
  // set views path, template engine and default layout
  //app.engine('html', swig.renderFile);
  //app.set('views', config.root + '/app/views');
  //app.set('view engine', 'html');
  
  // expose package.json to views
  app.use(function (req, res, next) {
    res.locals.pkg = pkg;
    res.locals.env = env;
    next();
  });
  
  
  
  app.use( cors() );
  // bodyParser should be above methodOverride
  app.use( bodyParser.json() );
  app.use( bodyParser.urlencoded({ extended: false }) );
  app.use(multer());
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
  app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: pkg.name,
    store: new mongoStore({
      url: config.db,
      collection : 'sessions'
    })
  }));

  // use passport session
  app.use(passport.initialize());
  app.use(passport.session());
  
  
  
  // adds CSRF support
  /*
  if (process.env.NODE_ENV !== 'test') {
    app.use(csrf());

    // This could be moved to view-helpers :-)
    app.use(function(req, res, next){
      res.locals.csrf_token = req.csrfToken();
      console.log( res.locals.csrf_token )
      next();
    });
  }*/

  
  
  /*
  app.on('mount', function (parent) {
    console.log(parent); // refers to the parent app
  });*/
  
}