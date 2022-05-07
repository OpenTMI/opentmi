/**
  Express configuration
*/

// native modules

/* 3rd party libraries */
const express = require('express');

// Express addons
const session = require('express-session');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const busboy = require('connect-busboy');
const cors = require('cors');
const Promise = require('bluebird');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');

const expressWinston = require('express-winston');
const logger = require('./tools/logger');

/* Project libraries */
const config = require('./tools/config');
const pkg = require('../package.json');

const env = process.env.NODE_ENV || 'development';

/**
 * Expose
 */
module.exports = (app) => {
  // Compression middleware (should be placed before express.static)
  app.use(compression({
    threshold: 512
  }));

  app.use(express.static(`${config.get('root')}/public`));

  const ignoreRoute = undefined;
  // const ignoreRoute = req => req.url.match(/^\/api/) == null;

  // Logging middleware
  app.use(expressWinston.logger({
    winstonInstance: logger,
    // meta: false, // optional: control whether you want to log the meta data about the request (default to true)
    // msg: "HTTP {{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}",
    // optional: customize the default logging message.
    // E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
    // Use the default Express/morgan request formatting, with the same colors.
    expressFormat: true,
    // Enabling this will override any msg and colorStatus if true.
    // Will only output colors on transports with colorize set to true.
    // Color the status code
    // uses the Express/morgan color palette (default green, 3XX cyan, 4XX yellow, 5XX red).
    // Will not be recognized if expressFormat is true
    colorize: true,
    ignoreRoute
  }));

  // set views path, template engine and default layout
  // app.engine('html', swig.renderFile);
  // app.set('views', config.root + '/app/views');
  // app.set('view engine', 'html');

  // expose package.json to views
  app.use((req, res, next) => {
    res.locals.pkg = pkg;
    res.locals.env = env;
    next();
  });

  app.use(cors());
  // bodyParser should be above methodOverride
  app.use(bodyParser.json({limit: '50mb'}));
  app.use(busboy({
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  }));
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(methodOverride((req) => {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      const method = req.body._method;
      delete req.body._method;
      return method;
    }

    return undefined;
  }));

  // cookieParser should be above session
  app.use(cookieParser());
  app.use(cookieSession({secret: 'secret'}));
  app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: pkg.name,
    store: new MongoStore({
      url: config.get('db'),
      collection: 'sessions'
    })
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // adds CSRF support when production mode
  if (process.env.NODE_ENV === 'production') {
    // Add CSRF (Cross-site request forgery) support only for production mode app
    // app.use(csrf());

    // This could be moved to view-helpers :-)
    // app.use(function(req, res, next){
    //  res.locals.csrf_token = req.csrfToken();
    //  logger.debug( res.locals.csrf_token )
    //  next();
    // });
  }

  /*
  app.on('mount', function (parent) {
    console.log(parent); // refers to the parent app
  }); */
  return Promise.resolve();
};
