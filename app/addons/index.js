// native modules
const fs = require('fs');
const path = require('path');

// 3rd party modules
const logger = require('winston');
const Addon = require('./addon');

const METADATA_KEY_LENGTH = 10;

process.on('warning', (err) => console.log(err));

// Pads a string to a certain length
function padToLength(txt, length) {
  let newTxt = txt;
  if (newTxt.length > length) {
    return `${newTxt.slice(0, length - 3)}...`; 
  }

  while (newTxt.length < length) { newTxt += ' '; }
  return newTxt;
}
// TODO
// singleton interface for winston logging service
// also works as a good storage for custom logging functions
// Error generation function
global.createErrorMessage = function (pError, pMetaInfo) {
  let combinedError = pError;

  // Append meta data lines
  const keys = Object.keys(pMetaInfo);
  for (let i = 0; i < keys.length - 1; i += 1) {
    const paddedKey = padToLength(keys[i], METADATA_KEY_LENGTH);
    combinedError += `\n ├ ${paddedKey}: ${pMetaInfo[keys[i]]}`;
  }
  if (keys.length > 0) {
    const paddedKey = padToLength(keys[keys.length - 1], METADATA_KEY_LENGTH);
    combinedError += `\n └ ${paddedKey}: ${pMetaInfo[keys[keys.length - 1]]}`;
  }

  return combinedError;
};

class AddonManager {
  constructor() {
    this.addons = [];
  }

  init(app, server, io) {
    this.app = app;
    this.server = server;
    this.io = io;
  }

  get availableModules() {
    return this.addons.map((addon) => {
      const obj = { name: addon.name, state: 'active' };
      return obj;
    });
  }

  loadAddons() {
    logger.info('Loading addons...');
    logger.debug(`used directory: ${__dirname}`);

    // Function that returns whether a file is a directory or not
    function isAddon(file) {
      return fs.lstatSync(path.join(__dirname, file)).isDirectory();
    }

    // Iterate through all directory files in the addons folder
    return Promise.all(fs.readdirSync(__dirname).filter(isAddon).map((file) => {
      const newAddon = new Addon(file);
      this.addons.push(newAddon);
      return newAddon.loadModule(file)
      .then(() => newAddon.createInstance(this.app, this.server, this.io))
      .catch((pError) => {
        logger.error(pError.message);
        logger.debug(pError.stack);
      });
    }));
  }

  registerAddons() {
    logger.info('Registering addons...');

    // Promise to register all addons
    const registerPromises = this.addons.filter(addon => addon.isInstantiated)
    .map(addon => addon.register()
      .catch((pError) => {
        pError.message = `Addon register failed: ${addon.name}\n${pError.message}`;
        logger.error(pError.message);
        logger.debug(pError.stack);
      }));

    return Promise.all(registerPromises);
  }

  findAddon(pName) {
    return this.addons.find(addon => addon.name === pName);
  }

  findAddonIndex(pAddon) {
    return this.addons.findIndex(addon => addon.name === pAddon.name);
  }

  registerAddon(index) {
    if (index < this.addons.length) {
      const addon = this.addons(index);
      logger.info(`Registering module: {${addon.name}}`);
      return addon.register();
    }

    const error = 'Cannot register addon with out of scope index';
    const meta = { index, addon_count: this.addons.length };
    return Promise.reject(new Error(global.createErrorMessage(error, meta)));
  }

  unregisterAddon(index) {
    if (index < this.addons.length) {
      const addon = this.addons(index);
      logger.info(`Unregistering module: {${addon.name}}`);
      return addon.unregister();
    }

    const error = 'Cannot unregister addon with out of scope index';
    const meta = { index, addon_count: this.addons.length };
    return Promise.reject(new Error(global.createErrorMessage(error, meta)));
  }

  _removeAddon(index, force = false) {
    if (index < this.addons.length) {
      const addon = this.addons[index];

      if (addon.safeToRemove || force) {
        // Safe to remove this addon
        logger.info(`Removing module: {${addon.name}}`);
        this.addons.splice(index, 1);
        return Promise.resolve();
      } else if (addon.isBusy) {
        // Something is in progress, better not remove
        const error = `Warning, should not remove addon: ${addon.name}.`;
        const meta = {
          current_status: addon.Status,
          solution: 'wait for the addon to finish, or just use force remove.' };
        return Promise.reject(new Error(global.createErrorMessage(error, meta)));
      } else if (addon.isRegistered) {
        // Addon is registered, should unregister before removing
        const error = `Warning, should not remove addon: ${addon.name}.`;
        const meta = {
          current_status: addon.Status,
          solution: 'please unregister the addon before removing, or just use force remove' };
        return Promise.reject(new Error(global.createErrorMessage(error, meta)));
      }

      // Expect the unexpected
      return Promise.reject(new Error('Unexpected failure of removeAddon'));
    }

    const error = 'Cannot remove module with out of scope index';
    const meta = { index, addon_count: this.addons.length };
    return Promise.reject(new Error(global.createErrorMessage(error, meta)));
  }
}

module.exports = new AddonManager();
