var express = require('express');
var mongoose = require('mongoose');
var _ = require('underscore');
var router = express.Router();

var Route = function(app, passport){

  var Testcase = mongoose.model('Testcase');


  Testcase.count({}, function(error, count){
    if( count === 0 ){
      var tcTemplate = {
        tcid: 'Testcase-',
        cre: { user: 'tmt'},
        owner: { user: 'nobody'},
        other_info: { title: 'Example case', purpose: 'dummy' },
        status: {value: 'unknown'},
      }
      var statuses =  ['unknown', 'released','development', 'broken'];
      for(var i=0;i<10;i++){
        var newTc = {};
        _.extend(newTc, tcTemplate)
        newTc.tcid += i;
        newTc.status.value = statuses[i%statuses.length];
        var TC = new Testcase(newTc);
        TC.save( function(error){
          if(error) console.log(error);
        });
      }
    }
  });  
  router.param('format', function(req, res, next, id){
    if( req.params.format == 'html' ) {
      var redirurl = '/#'+req.url.match(/\/api\/v0(.*)\.html/)[1];
      res.redirect( redirurl );
    } else {
      next();
    }
  });
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
  router.route('/api/v0/testcases.:format?')
    .all( function(req, res, next){
      req.doQuery = function(){
        console.log(req.query);
        Testcase.query( req.query, function(error, list){
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
  router.route('/api/v0/testcases/:testcase.:format?')
    .all( function(req, res, next){
      req.doUpdate = function(){
        delete req.body._id;
        delete req.body.__v;
        console.log(req.body);
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