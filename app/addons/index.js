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
// singleton interface for winston logging service would be nice,
// would also work as a good storage for custom logging functions
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

    this.app.use(this.dynamicRouter.router.bind(this.dynamicRouter));
  }

  /**
   * Loads addons found in directory app/addons/ in a
   * waterfall like synchronous manner one after another
   * @return {Promise} promise to try loading all addons
   */
  loadAddonsInOrder() {
    logger.info('Loading addons in order...');
    logger.debug(`Used directory: ${__dirname}`);

    // Function that returns whether a file is a directory or not
    function isAddon(pFile) {
      return fs.lstatSync(path.join(__dirname, pFile)).isDirectory();
    }

    const addonNames = fs.readdirSync(__dirname).filter(isAddon);
    this.addons = addonNames.map(pName => new Addon(pName, true));

    const recursiveLoad = (i) => {
      if (i >= addonNames.length) { return Promise.resolve(); }

      const addon = this.addons[i];
      logger.info(`[${addon.name}] Load started.`);

      return addon.loadModule()
      .then(() => addon.createInstance(this.server, this.io))
      .catch((pError) => {
        // Remove the error message from start for cleaner stack
        const headerLength = pError.message.length + pError.name.length + 2;
        const slicedStack = pError.stack.slice(headerLength, pError.stack.length);
        logger.error(`[${addon.name}] Addon load failed.\n${pError.message}`);
        logger.debug(slicedStack);
      })
      .then(() => recursiveLoad(i + 1));
    };

    return recursiveLoad(0);
  }

  /**
   * Loads addons found in directory app/addons/ in an arbitary order
   * @return {Promise} promise to try loading all addons
   */
  loadAddons() {
    logger.info('Loading addons...');
    logger.debug(`Used directory: ${__dirname}`);

    // Function that returns whether a file is a directory or not
    function isAddon(pFile) {
      return fs.lstatSync(path.join(__dirname, pFile)).isDirectory();
    }

    // Iterate through all directory files in the addons folder
    const loadPromises = fs.readdirSync(__dirname).filter(isAddon).map((pFile) => {
      const newAddon = new Addon(pFile, true);
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

  /**
   * Register all addons that have been loaded in an arbitary order
   * @return {Promise} promise to try registering all loaded addons
   */
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

  /**
   * Finds addon with a name
   * @param {string} pName - name of the addon to find
   * @return {Addon|undefined} either the addon or undefined
   */
  findAddon(pName) {
    return this.addons.find(addon => addon.name === pName);
  }

  /**
   * Finds the index of an addon
   * @param {Addon} pAddon - instance of Addon
   * @return {integer} index of an addon or -1
   */
  findAddonIndex(pAddon) {
    return this.addons.findIndex(addon => addon.name === pAddon.name);
  }

  /**
   * Attempts to registers a single addon
   * @param {Addon} pAddon - instance of addon
   * @return {Promise} promise to try and register the provided addon
   */
  registerAddon(pAddon) {
    logger.info(`[${pAddon.name}] Registering module.`);
    return pAddon.register(this.app, this.dynamicRouter);
  }

  /**
   * Attempts to unregister a single addon
   * @param {Addon} pAddon - instance of addon
   * @return {Promise} promise to try and unregister the provided addon
   */
  unregisterAddon(pAddon) {
    logger.info(`[${pAddon.name}] Unregistering module.`);
    return pAddon.unregister(this.dynamicRouter);
  }

  /**
   * Attempt to remove an addon, checks are made to ensure it is safe
   * @param {Addon} pAddon - instance of addon
   * @param {bool} force - remove addon without caring about its' state
   * @return {Promise} promise to try and remove the provided addon
   */
  removeAddon(pAddon, pForce = false) {
    const index = this.findAddonIndex(pAddon);
    if (index < this.addons.length) {
      if (pAddon.safeToRemove || pForce) {
        // Safe to remove this addon
        logger.info(`[${pAddon.name}}] Removing addon.`);
        this.addons.splice(index, 1);
        return Promise.resolve();
      } else if (pAddon.isBusy || pAddon.isRegistered) {
        // Something is in progress, better not remove
        const error = 'Should not remove addon, either busy or registered.';
        const meta = {
          status: pAddon.Status,
          solution: 'Unregister addon, wait for the addon to finish, or just use force remove.' };
        return Promise.reject(new Error(global.createErrorMessage(error, meta)));
      }

      // Expect the unexpected
      return Promise.reject(new Error('Unexpected failure of removeAddon.'));
    }

    const error = 'Cannot remove module with out of scope index.';
    const meta = { index, addon_count: this.addons.length };
    return Promise.reject(new Error(global.createErrorMessage(error, meta)));
  }
}


module.exports = new AddonManager();
