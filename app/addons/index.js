// native modules
const fs = require('fs');
const path = require('path');

// 3rd party modules
const logger = require('../tools/logger');
const {Addon} = require('./addon');

const DynamicRouter = require('./dynamic-router');

const METADATA_KEY_LENGTH = 10;
const ADDON_BASECLASS = 'opentmi-addon';
const ADDON_PREFIX = 'opentmi';

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
// singleton interface for winston logging service would be nice,
// would also work as a good storage for custom logging functions
// Error generation function
global.createErrorMessage = (error, metaInfo) => {
  let combinedError = `${error}`;

  // Append meta data lines
  const keys = Object.keys(metaInfo);
  for (let i = 0; i < keys.length - 1; i += 1) {
    const paddedKey = padToLength(keys[i], METADATA_KEY_LENGTH);
    combinedError += `\n ├ ${paddedKey}: ${metaInfo[keys[i]]}`;
  }
  if (keys.length > 0) {
    const paddedKey = padToLength(keys[keys.length - 1], METADATA_KEY_LENGTH);
    combinedError += `\n └ ${paddedKey}: ${metaInfo[keys[keys.length - 1]]}`;
  }

  return combinedError;
};

/**
 * Singleton data structure that manages installed addons
 */
class AddonManager {
  constructor() {
    this.addons = [];
    this.dynamicRouter = new DynamicRouter();
  }

  /**
   * Sets various variables that AddonManager needs in order to work
   */
  init(app, server, io, eventBus) {
    this.app = app;
    this.server = server;
    this.io = io;
    this.eventBus = eventBus;
    return Promise.resolve();
  }

  static _moduleLoadError(addon, message, error) {
    // Remove the error message from start for cleaner stack
    const headerLength = error.message.length + error.name.length + 2;
    const slicedStack = error.stack.slice(headerLength, error.stack.length);
    logger.error(`[${addon.name}] ${message}\n${error.message}`);
    logger.debug(slicedStack);
  }

  /**
   * Loads addons found in directory app/addons/ in a
   * waterfall like synchronous manner one after another
   * @return {Promise} promise to try loading all addons
   */
  static _recursiveLoad(addonArray, app, server, io, eventBus) {
    logger.info('Loading addons...');
    return addonArray.reduce(
      (acc, addon) => acc
        .then(() => addon.loadModule())
        .then(() => addon.createInstance(app, server, io, eventBus))
        .catch((error) => AddonManager._moduleLoadError(addon, 'Addon load failed.', error)),
      Promise.resolve()
    );
  }

  /**
   * Loads all addons using a specific loading method, eq. recursive, async
   * @param addonPath path where addons to be loaded: default: opentmi
   * @param prefix addon prefix. default: 'opentmi'
   * @return {Promise}
   */
  loadAddons({addonPath = path.resolve(__dirname, '../../node_modules'), prefix = ADDON_PREFIX}) {
    // Function that returns whether a file is a directory or not
    function isAddon(file) {
      const realPath = fs.realpathSync(path.resolve(addonPath, file));
      const lstat = fs.lstatSync(realPath);
      return lstat.isDirectory() && file.startsWith(prefix) && file !== ADDON_BASECLASS;
    }
    logger.debug(`Loading addons from path: ${addonPath}, required prefix: "${prefix}"`);
    // Iterate through all directory files in the addons folder
    const addonNames = fs.readdirSync(addonPath).filter(isAddon);
    this.addons = addonNames.map((name) => new Addon(name, true, addonPath));
    return AddonManager._recursiveLoad(this.addons, this.app, this.server, this.io, this.eventBus);
  }

  /**
   * Register all addons that have been loaded in an arbitary order
   * @return {Promise} promise to try registering all loaded addons
   */
  registerAddons() {
    logger.info('Registering addons...');

    // Promise to register all addons
    const registerPromises = this.addons
      .filter((addon) => addon.isLoaded)
      .map((addon) => addon.register(this.app, this.dynamicRouter)
        .catch((error) => AddonManager._moduleLoadError(addon, 'Addon register failed.', error)));

    return Promise.all(registerPromises)
      .then((results) => {
        this.app.use(this.dynamicRouter.router.bind(this.dynamicRouter));
        return Promise.resolve(results);
      });
  }

  /**
   * Finds addon with a name
   * @param {string} name - name of the addon to find
   * @return {Addon|undefined} either the addon or undefined
   */
  findAddon(name) {
    return this.addons.find((addon) => addon.name === name);
  }

  /**
   * Finds the index of an addon
   * @param {Addon} addon - instance of Addon
   * @return {integer} index of an addon or -1
   */
  findAddonIndex(targetAddon) {
    return this.addons.findIndex((addon) => addon.name === targetAddon.name);
  }

  /**
   * Attempts to registers a single addon
   * @param {Addon} addon - instance of addon
   * @return {Promise} promise to try and register the provided addon
   */
  registerAddon(addon) {
    logger.info(`Registering addon: [${addon.name}].`);
    return addon.register(this.app, this.dynamicRouter);
  }

  /**
   * Attempts to unregister a single addon
   * @param {Addon} addon - instance of addon
   * @return {Promise} promise to try and unregister the provided addon
   */
  unregisterAddon(addon) {
    logger.info(`Unregistering addon: [${addon.name}].`);
    return addon.unregister(this.dynamicRouter);
  }

  /**
   * Attempt to remove an addon, checks are made to ensure it is safe
   * @param {Addon} addon - instance of addon
   * @param {bool} force - remove addon without caring about the state
   * @return {Promise} promise to try and remove the provided addon
   */
  removeAddon(addon, force = false) {
    const index = this.findAddonIndex(addon);
    if (index < this.addons.length) {
      if (addon.safeToRemove || force) {
        // Safe to remove this addon
        logger.info(`Removing addon: [${addon.name}].`);
        this.addons.splice(index, 1);
        return Promise.resolve();
      } if (addon.isBusy || addon.isRegistered) {
        // Something is in progress, better not remove
        const error = 'Should not remove addon, either busy or registered.';
        const meta = {
          status: addon.Status,
          solution: 'Unregister addon, wait for the addon to finish, or just use force remove.'
        };
        return Promise.reject(new Error(global.createErrorMessage(error, meta)));
      }

      // Expect the unexpected
      return Promise.reject(new Error('Unexpected failure of removeAddon.'));
    }

    const error = 'Cannot remove module with out of scope index.';
    const meta = {index, addon_count: this.addons.length};
    return Promise.reject(new Error(global.createErrorMessage(error, meta)));
  }
}

module.exports = new AddonManager();
