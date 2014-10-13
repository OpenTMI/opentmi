var express = require('express');
var mongoose = require('mongoose');

var Route = function(app, passport){

  var router = express.Router();
  var Groups = mongoose.model('Group');
  
  router.route('/api/v0/groups.:format?')
    .all( function(req, res, next){
      req.doQuery = function(){
        Groups.query( req.query, function(error, list){
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