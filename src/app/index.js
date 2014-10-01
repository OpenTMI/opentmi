var fs = require('fs');

var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');



var app = express();
var port = 3000;

// Connect to mongodb
var connect = function () {
  var options = { server: { socketOptions: { keepAlive: 1 } } };
  mongoose.connect('localhost');
};

connect();

mongoose.connection.on('error', console.log);
mongoose.connection.on('disconnected', connect);

fs.readdirSync(__dirname + '/models').forEach(function (file) {
  if (~file.indexOf('.js')) require(__dirname + '/models/' + file);
});

// Bootstrap passport config
//require('./config/passport')(passport, config);

// Bootstrap application settings
require('../config/express')(app, passport);

// Bootstrap routes
fs.readdirSync(__dirname + '/routes').forEach(function (file) {
  if (~file.indexOf('.js')) {
    require(__dirname + '/routes/' + file)(app, passport);
  }
});


var AddonManager = require('./addons/');
AddonManager.RegisterModules(app, passport);

/**
 * Error handling
 */

app.use(function (err, req, res, next) {
  // treat as 404
  if (err.message
    && (~err.message.indexOf('not found')
    || (~err.message.indexOf('Cast to ObjectId failed')))) {
    return next();
  }
  console.error(err.stack);
  // error page
  res.status(500).render('500', { error: err.stack });
});

// assume 404 since no middleware responded
app.use(function (req, res, next) {
  res.status(404).render('404', {
    url: req.originalUrl,
    error: 'Not found'
  });
});

app.listen(port);
console.log('Express app started on port ' + port);