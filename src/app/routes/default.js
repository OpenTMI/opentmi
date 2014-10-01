var express = require('express');
var router = express.Router();

var Route = function(app, passport){

  app.get('/v0', function(req, res){
    res.send("API v0");
  });
  app.get('/v0/routes', function(req, res){
    res.json( app.routes );
  });
}

module.exports = Route;