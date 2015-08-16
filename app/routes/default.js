var express = require('express');
var _ = require('underscore');

var Route = function(app, passport){

  app.get('/api/v0', function(req, res){
    res.send("API v0");
  });
  app.get('/api/v0/routes.:format?', function(req, res){
    
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