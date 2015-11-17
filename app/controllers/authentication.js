var mongoose = require('mongoose');

var Controller = function(){

  this.login = function(req, res){
    console.log('Route: login');
    res.json({login: 'success'})
  }
  this.logout = function(req, res){
     req.logout();
     res.json({logout: 'success'});
  }
  var loginRequiredResponse = function(req, res){
    res.status(404).json({error: 'login required'});
  }
  var apiKeyRequiredResponse = function(req, res){
    res.status(404).json({error: 'apikey required'});
  }
  this.loginRequired = function(req, res, next){
    if( !req.user){
      loginRequiredResponse(req, res);
    } else {
      next()
    }
  }
  var User = mongoose.model('User');

  this.apiKeyRequired = function(req, res, next){
    User.apiKeyExists(req.query.apiKey, function(error, ok){
      if(error){
        apiKeyRequiredResponse(req, res);
      } else if(!ok){
        apiKeyRequiredResponse(req, res);
      } else {
        next();
      }
    })
  }
  this.adminRequired = function(req, res, next){
    if( !req.user ){
      loginRequiredResponse(req, res);
    } else if(!req.user.account_level){
      res.status(404).json({error: 'admin required'});
    } else {
      next();
    }
  }
  return this;
}

module.exports = Controller;