//internal modules
const fs = require('fs');
const path = require('path');

//3rd party modules
const _ = require('lodash')
const logger = require('winston');
const async = require('async');

class AddonManager {
  constructor(app, server, io) {
     const addons = [];
  }

  registerAddons() {
    logger.info('Loading addons...');

    // Iterate through all files in the addons folder
    fs.readdirSync(__dirname).forEach(function (file) {
      // Ignore files that end with .js or do not have a dot in them at all
      if (!file.match(/\.js$/) && !file.match(/^\./) ) {
        logger.verbose(` * ${file}`);
        const addonPath = path.join(__dirname, file);
        const packageJsonFile = path.join(addonPath, 'package.json');

        try {
          const packageJson = require(packageJsonFile);

          // ensure addons dependencies are installed
          if (!AddonManager._addonDependenciesInstalled(packageJson)) {
            return;
          }
        } catch (e) {
          logger.debug(e);
        }
        try {
          var Addon = require(addonPath);
          if(Addon.disabled) {
            logger.info('Addon %s is disabled', file);
            return;
          }

          this._registerAddon(new Addon(app, server, io));
        } catch(e) {
          addonPath = path.relative('.', addonPath)
          logger.error('Cannot load addon "%s": %s', addonPath, e.toString());
          logger.debug(e.stack);
        }
      }
    });

    app.get('/addons', listAddons);
  }

  static _addonDependenciesInstalled(file, pPackageJson) {
    const dependencies = Object.keys(_.get(pPackageJson, 'dependencies', {}));

    _.each(dependencies, (dependency) => {
      try {
        require.resolve(dependency);
      } catch (e) {
        logger.warn(`npm package: ${dependency} is not found, required by addon ${file}`);
        return false;
      }
    });

    return true;
  }

  listAddons(req, res) {
    var list = []
    _.each(addons, function(addon){
      lis.push( addon );
    })
    res.json(list);
  }

  get availableModules() {
    return _.map(addons, function(addon){return {name: addon.name, state: 'active'}});
  }

  _registerModule(addon) {
    addon.register();
    addons.push(addon);
  }

  unregisterModule(i, cb) {
    if (addons.length < i) {
      return false;
    }

    addons[i].unregister(cb);
    addons.splice(i, 1);
  }
} 


exports = module.exports = AddonManager;
