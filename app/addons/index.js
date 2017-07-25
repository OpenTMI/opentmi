// native modules
const fs = require('fs');
const path = require('path');

// 3rd party modules
const logger = require('winston');
const Addon = require('./addon').Addon;

const DynamicRouter = require('./dynamic-router');

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
  init(app, server, io) {
    this.app = app;
    this.server = server;
    this.io = io;
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
  static _recursiveLoad(addonArray, app, server, io) {
    return addonArray.reduce((acc, addon) => acc.then(() => {
      logger.info(`[${addon.name}] Load started.`);
      return addon.loadModule()
        .then(() => addon.createInstance(app, server, io))
        .catch(error => AddonManager._moduleLoadError(addon, 'Addon load failed.', error));
    }), Promise.resolve());
  }

  /**
   * Loads addons found in directory app/addons/ in an arbitary order
   * @return {Promise} promise to try loading all addons
   */
  static _asyncLoad(addonArray, app, server, io) {
    return Promise.all(addonArray.map((addon) => {
      logger.info(`[${addon.name}] Load started.`);
      return addon.loadModule()
        .then(() => addon.createInstance(app, server, io))
        .catch(error => AddonManager._moduleLoadError(addon, 'Addon load failed.', error));
    }));
  }

  /**
   * Loads all addons using a specific loading method, eq. recursive, async
   */
  loadAddons(recursive = true) {
    const relativeAddonPath = path.relative('.', __dirname);

    // Function that returns whether a file is a directory or not
    function isAddon(file) {
      return fs.lstatSync(path.resolve(relativeAddonPath, file)).isDirectory();
    }

    // Iterate through all directory files in the addons folder
    const addonNames = fs.readdirSync(relativeAddonPath).filter(isAddon);
    this.addons = addonNames.map(name => new Addon(name, true));

    const loadMethod = recursive ? AddonManager._recursiveLoad : AddonManager._asyncLoad;
    return loadMethod(this.addons, this.app, this.server, this.io);
  }

  /**
   * Register all addons that have been loaded in an arbitary order
   * @return {Promise} promise to try registering all loaded addons
   */
  registerAddons() {
    logger.info('Registering addons...');

    // Promise to register all addons
    const registerPromises = this.addons
      .filter(addon => addon.isLoaded)
      .map(addon => addon.register(this.app, this.dynamicRouter)
        .catch(error => AddonManager._moduleLoadError(addon, 'Addon register failed.', error)));

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
    return this.addons.find(addon => addon.name === name);
  }

  /**
   * Finds the index of an addon
   * @param {Addon} addon - instance of Addon
   * @return {integer} index of an addon or -1
   */
  findAddonIndex(targetAddon) {
    return this.addons.findIndex(addon => addon.name === targetAddon.name);
  }

  /**
   * Attempts to registers a single addon
   * @param {Addon} addon - instance of addon
   * @return {Promise} promise to try and register the provided addon
   */
  registerAddon(addon) {
    logger.info(`[${addon.name}] Registering module.`);
    return addon.register(this.app, this.dynamicRouter);
  }

  /**
   * Attempts to unregister a single addon
   * @param {Addon} addon - instance of addon
   * @return {Promise} promise to try and unregister the provided addon
   */
  unregisterAddon(addon) {
    logger.info(`[${addon.name}] Unregistering module.`);
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
        logger.info(`[${addon.name}] Removing addon.`);
        this.addons.splice(index, 1);
        return Promise.resolve();
      } else if (addon.isBusy || addon.isRegistered) {
        // Something is in progress, better not remove
        const error = 'Should not remove addon, either busy or registered.';
        const meta = {
          status: addon.Status,
          solution: 'Unregister addon, wait for the addon to finish, or just use force remove.'};
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
