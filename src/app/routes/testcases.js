var express = require('express');
var router = express.Router();

var Route = function(app, passport){

  
  router.param('testcase', function(req, res, next, id){
    //find from db
    req.testcase = {id: 'Tc1'}
    next();
  });
  router.route('/v0/testcases')
    .all( function(req, res, next){
      next();
    })
    .get( function(req, res){
      res.send("Testcase frontpage");
    })
    .post( function(req, res){
      res.send("default");
    });
  router.route('/v0/testcases/:testcase')
    .all( function(req, res, next){
      next();
    })
    .get( function(req, res){
      res.send(req.testcase);
    })
    .put( function(req, res){
      //res.send("default");
    })
    .delete( function(req, res){
      //res.send("default");
    });
  app.use( router );
}

module.exports = Route;