var fs = require('fs');
var winston = require('winston')

function AddonManager (app, server, io, passport){
  var self = this;
  var addons = [];
  
  this.RegisterAddons = function() {
    
    fs.readdirSync(__dirname).forEach(function (file) {
      if (!file.match(/\.js$/) && !file.match(/^\./) ) {
         winston.info("-RegisterAddon: '"+file+"'");
         try {
           var Addon = require(__dirname + '/' + file);
           var addon = new Addon(app, server, io, passport);
           addon.register();
           addons.push( addon  );
         } catch(e) {
           winston.error(e);
         }
      }
    });  
  };
  this.AvailableModules = function() {
    return addons;
  };

  this.UnregisterModule = function(i, cb){
    if( addons.length < i ) return false;
    addons[i].unregister(cb);
    addons.splice(i, 1);
  }

  return this;
}

exports = module.exports = AddonManager;