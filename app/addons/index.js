//internal modules
var fs = require('fs');
var path = require('path');

//3rd party modules
var _ = require('underscore')
var winston = require('winston')
var async = require('async');

function AddonManager (app, server, io){
  var self = this;
  var addons = [];
  
  this.RegisterAddons = function() {
    
    fs.readdirSync(__dirname).forEach(function (file) {
      if (!file.match(/\.js$/) && !file.match(/^\./) ) {
         winston.info("-RegisterAddon: '"+file+"'");
         var addonPath = path.join(__dirname, file)
         try {
           var Addon = require(addonPath);
           var addon = new Addon(app, server, io);
           addon.register();
           addons.push( addon  );
         } catch(e) {
            winston.error('Cannot load addon "%s": %s', addonPath, e.toString());
         }
      }
    });  

    app.get('/addons', listAddons);

  };
  var listAddons = function(req, res){
    var list = []
    _.each(addons, function(addon){
      lis.push( addon );
    })
    res.json(list);
  }
  this.AvailableModules = function() {
    return _.map(addons, function(addon){return {name: addon.name, state: 'active'}});
  };

  this.UnregisterModule = function(i, cb){
    if( addons.length < i ) return false;
    addons[i].unregister(cb);
    addons.splice(i, 1);
  }

  return this;
}

exports = module.exports = AddonManager;