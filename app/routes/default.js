var express = require('express');
var _ = require('lodash');
var nconf = require('nconf');

var Route = function(app, passport){
  api = express()
  global.api_v0 = api_v0 = express()
  app.use('/api', api);
  api.use('/v0', api_v0);

  api.get('/', function(req, res){
    res.json({
      name: app.get('name'),
      mode: process.env.NODE_ENV?process.env.NODE_ENV:'development',
      //listenscope: nconf.get('host'),
      hostname: req.hostname
    });
  });
  
  api_v0.get('/', function(req, res){
    res.json({
      apiVersion: 'v0',
    });
  });
  
  api_v0.get('/routes.:format?', function(req, res){
    
    var routes = [];
    app._router.stack.forEach( function(item){
      if( item.route && item.route.path ){
        var k = Object.keys(item.route.methods)
        routes.push( k[0]+':'+item.route.path );
      }
    })
    res.json( {routes: routes, stack: app._router.stack } );
  });
}

module.exports = Route;