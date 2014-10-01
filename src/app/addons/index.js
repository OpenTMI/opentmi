var fs = require('fs');

function AddonManager (){
  this.addons = [];

  var _privilegedMethod = function (){};
}
AddonManager.prototype.RegisterModules = function(app, passport) {
  var self = this;
  console.log('RegisterModules');
  fs.readdirSync(__dirname).forEach(function (file) {
    if (file.indexOf('.js')<0) {
       console.log("Register addon: '"+file+"'");
       var addon = require(__dirname + '/' + file);
       self.addons.push( new addon(app, passport) );
    }
  });  
};
AddonManager.prototype.AvailableModules = function() {
  return this.addons;
};
AddonManager.prototype.UnregisterModule = function(i) {
  console.log("world");
};

exports = module.exports = new AddonManager();

exports.AddonManager = AddonManager;