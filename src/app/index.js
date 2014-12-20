var fs = require('fs');

var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');

var config = require('./../config/config.js');

var app = express();
var port = 3000;

// Connect to mongodb
var connect = function () {
  var options = { server: { socketOptions: { keepAlive: 1 } } };
  mongoose.connect(config.db);
};

connect();

mongoose.connection.on('error', console.log);
mongoose.connection.on('disconnected', connect);

fs.readdirSync(__dirname + '/models').forEach(function (file) {
  if (~file.indexOf('.js')){
    require(__dirname + '/models/' + file);
  }
});

// Bootstrap passport config
//require('./config/passport')(passport, config);

// Bootstrap application settings
require('../config/express')(app, passport);

// Bootstrap routes
fs.readdirSync(__dirname + '/routes').forEach(function (file) {
  if ( file.match(/.*\.js$/) && !file.match(/error\.js$/) ) {
    console.log('-AddRoute: '+file);
    require(__dirname + '/routes/' + file)(app, passport);
  }
});


GLOBAL.AddonManager = require('./addons/');
GLOBAL.AddonManager.RegisterAddons(app, passport);

require(__dirname + '/routes/error.js')(app, passport);

app.listen(port);
console.log('Express app started on port ' + port);