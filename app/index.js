var fs = require('fs');
var http = require('http');

var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');

var config = require('./../config/config.js');

var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);
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
  if (file.indexOf('.js$')){
    console.log('-RegisterModel: '+file);
    require(__dirname + '/models/' + file);
  }
});

// Bootstrap passport config
require('../config/passport')(passport, config);


// Bootstrap application settings
require('../config/express')(app, passport);

// Bootstrap routes
fs.readdirSync(__dirname + '/routes').forEach(function (file) {
  if ( file.match(/\.js$/) && 
      !file.match(/error\.js$/)) {
    console.log('-AddRoute: '+file);
    require(__dirname + '/routes/' + file)(app, passport);
  }
});

var Addons = require('./addons');
GLOBAL.AddonManager = new Addons(app, server, io, passport);
GLOBAL.AddonManager.RegisterAddons();


require(__dirname + '/routes/error.js')(app, passport);

server.listen(port, function(){
  console.log('TMT started on port ' + port);
});