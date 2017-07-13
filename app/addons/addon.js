require('colors');

// native modules
const path = require('path');
const childProcess = require('child_process');

// 3rd party modules
const express = require('express');
const logger = require('winston');
const Promise = require('bluebird');

const exec = Promise.promisify(childProcess.exec, { multiArgs: true });

const STATES = { introduce: 0, load: 1, register: 3, unregister: 4 };
const PHASES = { inProgress: 0, done: 1, failed: 2 };

/**
 * Data structure for addon that is responsible for keeping track of the current status
 * @todo possibly count size of addon to spot rogue addons
 * @todo timeout for addon loading
 */
class Addon {
  constructor(pName, pLoadedDuringStartup = false) {
    this.name = pName;
    this._status = { state: STATES.introduce, phase: PHASES.done };

    this.addonPath = path.join(__dirname, this.name);

    this.hasStaticContent = false;
    this.loadedDuringStartup = pLoadedDuringStartup;
  }

  /**
   * Returns a json formatted packet of information about this addon
   * @return {string} json string
   */
  get Json() {
    return JSON.stringify({ name: this.name, description: this.description, status: this.Status });
  }

  /**
   * Formats current status into a human readable string
   * @return {string} string representing current state
   */
  get Status() {
    const state = Object.keys(STATES).find(pKey => STATES[pKey] === this._status.state);
    const phase = Object.keys(PHASES).find(pKey => PHASES[pKey] === this._status.phase);

    return `${state}-${phase}`;
  }

  /**
   * Convenience function to check whether this addon is currently busy
   * @return {bool} current availability
   */
  get isBusy() { return this._status.phase === PHASES.inProgress; }

  /**
   * Convenience function to check whether this addon has successfully loaded
   * @return {bool} current load status
   */
  get isLoaded() {
    return ((this._status.state >= STATES.load) &&
            (this._status.phase === PHASES.done));
  }

  /**
   * Convenience function to check whether this addon is currently registered
   * @return {bool} current register status
   */
  get isRegistered() {
    return (this._status.state === STATES.register) &&
           (this._status.phase === PHASES.done);
  }

  /**
   * Convenience function to check whether this addon is safe to remove or not
   * @return {bool} current safe to remove status
   */
  get safeToRemove() { return !this.isRegistered && !this.isBusy; }

  /**
   * Load module into memory with require. This starts the loading procedure
   * @return {Promise} promise to load the module information and
   *                   dependencies of an addon if possible
   */
  loadModule() {
    if (this._status.state !== STATES.introduce || this.isBusy) {
      const error = `[${this.name}] Cannot load module for addon.`;
      const meta = { state: this.Status };
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }

    // Load module for the addon
    logger.debug(`[${this.name}] Loading addon.`);
    this._status = { state: STATES.load, phase: PHASES.inProgress };
    return Addon._loadAddonModule(this)
    .then((AddonModule) => {
      this.Module = AddonModule;
    });
  }

  /**
   * Creates new instance from the loaded module. This finishes the loading procedure
   * @param {Object} pServer - instance of http/https server that the addon can use
   * @param {Object} pIo - instance of socket.io
   * @return {Promise} promise to create an instance of the addon
   */
  createInstance(pServer, pSocketIO) {
    logger.debug(`[${this.name}] Creating addon instance.`);
    return (new Promise((resolve) => {
      logger.debug(`[${this.name}] Instantiating addon.`);
      this.instance = new this.Module(pServer, pSocketIO);
      this._status.phase = PHASES.done;
      resolve();
    }))
    .catch((pError) => {
      this._status.phase = PHASES.failed;
      const error = `[${this.name}] Failed to instantiate addon.`;
      const meta = { message: pError.message };
      pError.message = global.createErrorMessage(error, meta);
      return Promise.reject(pError);
    });
  }

  /**
   * Registers the addon to the current server, if addon needs static resources
   * the server will need to restart before those become available
   * @param {Object} pApp - instance of app that is used to introduce static paths
   * @param {DynamicRouter} pDynamicRouter - instance of custom router that can be joined and left without problems
   * @return promise to register the addon if possible
   */
  register(pApp, pDynamicRouter) {
    if (this._status.state !== STATES.load || this.isBusy) {
      const error = `[${this.name}] Cannot register addon.`;
      const meta = { state: this.Status };
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }

    if (this.Module.disabled) {
      return Promise.reject();
    }

    logger.debug(`[${this.name}] Addon in correct state, registering addon.`);
    this._status = { state: STATES.register, phase: PHASES.inProgress };
    try {
      return this.instance.register().then(() => {
        this._registerRouter(pDynamicRouter);
        this._registerStaticPath(pApp);

        this.registered = true;
        this._status.phase = PHASES.done;
      }).catch((pError) => {
        this.registered = false;
        this._status.phase = PHASES.failed;

        const error = `[${this.name}] Register raised an error.`;
        const meta = { message: pError.message };
        pError.message = global.createErrorMessage(error, meta);
        return Promise.reject(pError);
      });
    } catch (pError) {
      const error = `[${this.name}] Error thrown outside of promise while registering block.`;
      const meta = {
        message: pError.message,
        solution: 'Addon probably defined wrongly, check that register returns a promise.'
      };
      pError.message = global.createErrorMessage(error, meta);
      return Promise.reject(pError);
    }
  }

  /**
   * Registers this addon to the list of routers in the DynamicRouter
   */
  _registerRouter(pDynamicRouter) {
    if (this.instance.router) {
      pDynamicRouter.addonRouters.push({
        addon: this,
        router: this.instance.router
      });
    }
  }

  /**
   * Registers this addons static content to the server,
   * but only if this addon has been loaded at startup
   */
  _registerStaticPath(pApp) {
    if (this.instance.staticPath) {
      this.hasStaticContent = true;

      // Can only load static content during startup
      // otherwise it will be overridden by error route
      if (this.loadedDuringStartup) {
        const pathToServe = path.join(this.addonPath, this.instance.staticPath);
        pApp.use(`/${this.name}`, express.static(pathToServe));
      }
    }
  }

  /**
   * Unregisters the addon from the server, if addon has static resources
   * the server will have to restart before those resources are freed
   * @param {DynamicRouter} pDynamicRouter - instance of custom router that can be joined and left without problems
   * @return {Promise} promise to unregister the addon if possible
   */
  unregister(pDynamicRouter) {
    if (this._status.state !== STATES.register || this.isBusy) {
      const error = `[${this.name}] Cannot unregister addon.`;
      const meta = { state: this.Status };
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }

    logger.debug(`[${this.name}] Addon in correct state, unregistering addon.`);
    this._status = { state: STATES.unregister, phase: PHASES.inProgress };
    try {
      return this.instance.unregister().then(() => {
        // Remove this addon from the router list
        pDynamicRouter.removeRouter(this);
        this._status = { state: STATES.load, phase: PHASES.done };
      }).catch((pError) => {
        // We cannot assume that addon is still registered, we can't really say anything at this point
        this._status.phase = PHASES.failed;
        const error = `[${this.name}] Failed to unregister addon.`;
        const meta = { message: pError.message };
        return Promise.reject(new Error(global.createErrorMessage(error, meta)));
      });
    } catch (pError) {
      const error = `[${this.name}] Error thrown outside of promise while unregistering block.`;
      const meta = {
        message: pError.message,
        solution: 'Addon probably defined wrongly, check that unregister returns a promise.'
      };
      pError.message = global.createErrorMessage(error, meta);
      return Promise.reject(pError);
    }
  }

  /**
   * Performs the actions needed to load a module
   * Note: addon reference is needed because promises tend to mess up the
   *       reference to "this" variable
   * @param {Addon} pAddon - instance of an addon
   * @return {Promise} promise to require and resolve a module
   */
  static _loadAddonModule(pAddon) {
    return Addon._requirePackageFile(pAddon)
    // Install dependencies and ensure that they are installed
    .then((pPackageFile) => {
      const installPromise = Addon._installDependencies(pAddon)
      .then(() => Addon._checkDependencies(pAddon, pPackageFile.dependencies || {}));

      return installPromise;
    })
    .catch((pError) => {
      if (pError.canContinue) { // If this error is from require package file, it will have this property
        logger.warn(pError.message);
        return Promise.resolve(); // package.json error is not fatal and often not a problem
      }
      return Promise.reject(pError);
    })
    // Finally require the module
    .then(() => Addon._requireModule(pAddon));
  }

  /**
   * Install dependencies in addon with npm install
   * @param {Addon} pAddon - instance of an addon
   * @return {Promise} promise to install dependencies eventually
   */
  static _installDependencies(pAddon) {
    const command = 'npm install';

    logger.info(`[${pAddon.name}] npm installing, working directory: ${pAddon.addonPath}.`);
    return exec(command, { cwd: pAddon.addonPath }).then(([stdout, stderr]) => {
      logger.info(`[${pAddon.name}] npm finished.`);
      logger.debug(`STDOUT - "${command}"\n${stdout}`);
      logger.debug(`STDERR - "${command}"\n${stderr}`);
    });
  }

  /**
   * Ensures all dependencies in the provided dependency object,
   * throws error if package cannot be resolved
   * @param {Addon} pAddon - instance of an addon
   * @param {Object} pDependencies - object containing key value pairs of dependencies
   * @return {Promise} promise to check dependencies
   */
  static _checkDependencies(pAddon, pDependencies) {
    const dependencyKeys = Object.keys(pDependencies);
    return Promise.all(dependencyKeys.map(dependency => Addon._checkDependency(pAddon, dependency)));
  }

  /**
   * Ensures that a single dependency can be resolved
   * @param {Addon} pAddon - instance of an addon
   * @param {string} pDependency - name of a dependency
   * @return {Promise} promise to try and resolve the dependency
   */
  static _checkDependency(pAddon, pDependency) {
    const addonPath = path.join(module.paths[module.paths.length - 1], pAddon.name);

    return (new Promise((resolve) => {
      // Change require context to addons context
      module.paths.push(addonPath);

      // Try to resolve the dependency
      require.resolve(pDependency);

      module.paths.pop();
      resolve();
    }))
    .catch((pError) => {
      module.paths.pop();
      const error = `[${pAddon.name}] Dependency not found.`;
      const meta = {
        dependency: pDependency,
        message: pError.message
      };
      pError.message = global.createErrorMessage(error, meta);
      return Promise.reject(pError);
    });
  }

  /**
   * Attemps to require a package file from addon folder,
   * resolves the parsed contents of the file if successful
   * @param {Addon} pAddon - isntance of an addon
   * @returns {Promise} promise that resolves parsed contents of a package.json file
   */
  static _requirePackageFile(pAddon) {
    const addonPackageFilePath = path.join(pAddon.addonPath, 'package.json');

    return (new Promise((resolve) => {
      const packageJson = require(addonPackageFilePath); // eslint-disable-line
      resolve(packageJson);
    })).catch((pError) => {
      const error = `[${pAddon.name}] Failed to require package.json.`;
      const meta = {
        filepath: path.relative('.', addonPackageFilePath),
        message: pError.message
      };
      pError.message = global.createErrorMessage(error, meta);
      pError.canContinue = true;
      return Promise.reject(pError);
    });
  }

  /**
   * Attemps to require a module, addon needs a valid index.js for this to work
   * @param {Addon} pAddon - instance of an addon
   * @return {Promise} promise that resolves a module from the addon folder
   */
  static _requireModule(pAddon) {
    return (new Promise((resolve) => {
      // disable eslint because we need dynamic require for addons
      const AddonModule = require(pAddon.addonPath); // eslint-disable-line
      resolve(AddonModule);
    })).catch((pError) => {
      const error = `[${pAddon.name}] Failed to require module.`;
      const meta = {
        filepath: path.relative('.', pAddon.addonPath),
        message: pError.message
      };
      pError.message = global.createErrorMessage(error, meta);
      return Promise.reject(pError);
    });
  }
}


module.exports = Addon;
