var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();

var Route = function(app, passport){

  var Testcase = mongoose.model('Testcase');
  
  router.param('testcase', function(req, res, next, id){
    //find from db
    Testcase.findOne( {_id: req.params.testcase}, function(error, tc){
      if( error ) {
        res.status(300).json( {error: error} );
      } else if( tc ) {
        req.testcase = tc;
        next();
      }
    })
  });
  router.route('/api/v0/testcases')
    .all( function(req, res, next){
      req.doQuery = function(){
        Testcase.find( req.query, function(error, list){
          if( error ) {
            res.status(300).json({error: error});
          } else {
            res.json(list);
          }
        });
      }
      next();
    })
    .get( function(req, res){
      req.doQuery();
    })
    .post( function(req, res){
      var newTc = new Testcase(req.body);
      newTc.save(function (err) {
        res.json(req.body);
      });
    });
  router.route('/api/v0/testcases/:testcase')
    .all( function(req, res, next){
      req.doUpdate = function(){
        delete req.body._id;
        delete req.body.__v;
        Testcase.findByIdAndUpdate( req.params.testcase, req.body, function(error, doc){
          if( error ) {
            res.status(300).json({error: error});
          } else {
            res.json(doc);
          } 
        });
      }
      req.doRemove = function(){
        Testcase.findByIdAndRemove( req.params.testcase, function(error, ok){
          if( error ) {
            res.status(300).json({error: error});
          } else {
            res.json({});
          } 
        });
      }
      next();
    })
    .get( function(req, res){
      res.json(req.testcase);
    })
    .put( function(req, res){
      req.doUpdate();
    })
    .delete( function(req, res){
      req.doRemove();
    });
  app.use( router );
}

module.exports = Route;