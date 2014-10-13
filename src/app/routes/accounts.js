var express = require('express');
var mongoose = require('mongoose');

var Route = function(app, passport){

  var router = express.Router();
  var Accounts = mongoose.model('User');
  
  router.param('account', function(req, res, next, id){
    //find from db
    Accounts.findOne( {_id: req.params.account}, function(error, tc){
      if( error ) {
        res.status(300).json( {error: error} );
      } else if( tc ) {
        req.testcase = tc;
        next();
      }
    })
  });
  
  router.route('/api/v0/accounts.:format?')
    .all( function(req, res, next){
      req.doQuery = function(){
        Accounts.query( req.query, function(error, list){
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
    
  app.use( router );
}

module.exports = Route;