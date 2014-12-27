var express = require('express');
var mongoose = require('mongoose');
var restify = require('express-restify-mongoose');

var Route = function(app, passport){

  //easy way, but not support format -functionality..
  var Build = mongoose.model('Build');
  restify.serve(app, Build, {
    version: '/v0',
    name: 'builds',
    idProperty: '_id',
    protected: '__v',
  });

  //dummy data if db is empty
  Build.count( {}, function(err, count){
    if(count===0){ 
      
      (new Build({
          name: 'build-1',
          commit_id: '123', 
          location: [{url: 'http://server/mybuild.zip'}],
          target: { simulator: true}
        })).save(); 

      (new Build({
          name: 'build-2', 
          commit_id: '456',
          location: [{url: 'http://server/mybuild2.zip'}],
          target: { simulator: true}
        })).save(); 
    }
  });
}

module.exports = Route;