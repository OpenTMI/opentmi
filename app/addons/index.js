var fs = require('fs');

function AddonManager (){
  this.addons = [];

  var _privilegedMethod = function (){};
}
AddonManager.prototype.RegisterAddons = function(app, server, io, passport) {
  var self = this;
  fs.readdirSync(__dirname).forEach(function (file) {
    if (!file.match(/\.js$/) && !file.match(/^\./) ) {
       console.log("-RegisterAddon: '"+file+"'");
       try {
         var Addon = require(__dirname + '/' + file);
         var addon = new Addon(app, server, io, passport);
         addon.register();
         self.addons.push( addon  );
       } catch(e) {
         console.log(e);
       }
    }
  });  
};
AddonManager.prototype.AvailableModules = function() {
  return this.addons;
};

UnregisterModule = function(i, cb){
  if( this.addons.length < i ) return false;
  this.addons[i].unregister(cb);
  this.addons.splice(i, 1);
}

AddonManager.prototype.UnregisterModule = function(i) {
  UnregisterModule(i);
};

exports = module.exports = new AddonManager();
exports.AddonManager = AddonManager;