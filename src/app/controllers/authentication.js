

var Controller = function(){

  this.login = function(req, res){
    console.log('Route: login');
    res.json({login: 'success'})
  }
  this.logout = function(req, res){
     req.logout();
     res.json({logout: 'success'});
  }
  return this;
}

module.exports = Controller;