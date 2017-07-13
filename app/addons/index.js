// native modules
const fs = require('fs');
const path = require('path');

// 3rd party modules
const logger = require('winston');
const Addon = require('./addon');

const DynamicRouter = require('./dynamic_router');

const METADATA_KEY_LENGTH = 10;

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
  let combinedError = `${pError}`;

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
    this.dynamicRouter = new DynamicRouter();
  }

  init(app, server, io) {
    this.app = app;
    this.server = server;
    this.io = io;

    this.app.use(this.dynamicRouter.router.bind(this.dynamicRouter));
  }

  get availableModules() {
    return this.addons.map((pAddon) => {
      const obj = { name: pAddon.name, state: pAddon.Status };
      return obj;
    });
  }

  loadAddonsInOrder() {
    logger.info('Loading addons in order...');
    logger.debug(`Used directory: ${__dirname}`);

    // Function that returns whether a file is a directory or not
    function isAddon(file) {
      return fs.lstatSync(path.join(__dirname, file)).isDirectory();
    }

    const addonNames = fs.readdirSync(__dirname).filter(isAddon);
    const recursiveLoad = ((i) => {
      if (i >= addonNames.length) {
        return Promise.resolve();
      }

      const newAddon = new Addon(addonNames[i], true);
      this.addons.push(newAddon);
      logger.info(`[${newAddon.name}] Load started.`);

      return newAddon.loadModule()
      .then(() => newAddon.createInstance(this.server, this.io))
      .catch((pError) => {
        // Remove the error message from start for cleaner stack
        const headerLength = pError.message.length + pError.name.length + 2;
        const slicedStack = pError.stack.slice(headerLength, pError.stack.length);
        logger.error(`[${newAddon.name}] Addon load failed.\n${pError.message}`);
        logger.debug(slicedStack);
      })
      .then(() => recursiveLoad(i + 1));
    });

    return recursiveLoad(0);
  }

  loadAddons() {
    logger.info('Loading addons...');
    logger.debug(`Used directory: ${__dirname}`);

    // Function that returns whether a file is a directory or not
    function isAddon(file) {
      return fs.lstatSync(path.join(__dirname, file)).isDirectory();
    }

    // Iterate through all directory files in the addons folder
    const loadPromises = fs.readdirSync(__dirname).filter(isAddon).map((file) => {
      const newAddon = new Addon(file, true);
      this.addons.push(newAddon);
      logger.info(`[${newAddon.name}] Load started.`);

      return newAddon.loadModule()
      .then(() => newAddon.createInstance(this.server, this.io))
      .catch((pError) => {
        // Remove the error message from start for cleaner stack
        const headerLength = pError.message.length + pError.name.length + 2;
        const slicedStack = pError.stack.slice(headerLength, pError.stack.length);
        logger.error(`[${newAddon.name}] Addon load failed.\n${pError.message}`);
        logger.debug(slicedStack);
      });
    });

    return Promise.all(loadPromises);
  }

  registerAddons() {
    logger.info('Registering addons...');

    // Promise to register all addons
    const registerPromises = this.addons.filter(addon => addon.isLoaded)
    .map(addon => addon.register(this.app, this.dynamicRouter)
      .catch((pError) => {
        // Remove the error message from start for cleaner stack
        const slicedStack = pError.stack.slice(pError.message.length + pError.name.length + 2, pError.stack.length);
        logger.error(`[${addon.name}] Addon register failed.\n${pError.message}`);
        logger.debug(slicedStack);
      }));

    return Promise.all(registerPromises);
  }

  findAddon(pName) {
    return this.addons.find(addon => addon.name === pName);
  }

  findAddonIndex(pAddon) {
    return this.addons.findIndex(addon => addon.name === pAddon.name);
  }

  registerAddon(addon) {
    logger.info(`[${addon.name}] Registering module.`);
    return addon.register(this.app, this.dynamicRouter);
  }

  unregisterAddon(addon) {
    logger.info(`[${addon.name}] Unregistering module.`);
    return addon.unregister(this.dynamicRouter);
  }

  _removeAddon(index, force = false) {
    if (index < this.addons.length) {
      const addon = this.addons[index];

      if (addon.safeToRemove || force) {
        // Safe to remove this addon
        logger.info(`[${addon.name}}] Removing addon.`);
        this.addons.splice(index, 1);
        return Promise.resolve();
      } else if (addon.isBusy || addon.isRegistered) {
        // Something is in progress, better not remove
        const error = `[${addon.name}] Should not remove addon, either busy or registered.`;
        const meta = {
          current_status: addon.Status,
          solution: 'Unergister addon, wait for the addon to finish, or just use force remove.' };
        return Promise.reject(new Error(global.createErrorMessage(error, meta)));
      }

      // Expect the unexpected
      return Promise.reject(new Error(`[${addon.name}] Unexpected failure of removeAddon.`));
    }

    const error = 'Cannot remove module with out of scope index.';
    const meta = { index, addon_count: this.addons.length };
    return Promise.reject(new Error(global.createErrorMessage(error, meta)));
  }
}

module.exports = new AddonManager();
