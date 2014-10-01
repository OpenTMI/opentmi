var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();

var Route = function(app, passport){

  var Testcase = mongoose.model('Testcase');
  router.param('testcase', function(req, res, next, id){
    //find from db
    //req.testcase = {id: 'Tc1'}
    Testcase.findOne( {_id: req.testcase}, function(error, tc){
      req.testcase = tc;
      next();
    })
    //next();
  });
  router.route('/v0/testcases')
    .all( function(req, res, next){
      next();
    })
    .get( function(req, res){
      Testcase.find({}, function(error, tcs){
        res.json(tcs);
      });
      
    })
    .post( function(req, res){
      var instance = new Testcase(req.body);
      instance.save(function (err) {
        res.json(req.body);
      });
    });
  router.route('/v0/testcases/:testcase')
    .all( function(req, res, next){
      next();
    })
    .get( function(req, res){
      res.send(req.testcase);
    })
    .put( function(req, res){
      res.status(501).send();
    })
    .delete( function(req, res){
      res.status(501).end();
    });
  app.use( router );
}

module.exports = Route;