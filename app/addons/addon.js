require('colors');

// native modules
const path = require('path');
const childProcess = require('child_process');

// 3rd party modules
const express = require('express');
const logger = require('../tools/logger');
const Promise = require('bluebird');

const exec = Promise.promisify(childProcess.exec, {multiArgs: true});

const STATES = Object.freeze({introduce: 0, load: 1, register: 2, unregister: 3});
const PHASES = Object.freeze({inProgress: 0, done: 1, failed: 2});

/**
 * Data structure for addon that is responsible for keeping track of the current status
 * @todo possibly count size of addon to spot rogue addons
 * @todo timeout for addon loading
 * @todo store addon instances in database
 */
class Addon {
  constructor(name, loadedDuringStartup = false) {
    this.name = name;
    this._status = {state: STATES.introduce, phase: PHASES.done};

    this.addonPath = path.join(__dirname, this.name);

    this.hasStaticContent = false;
    this.loadedDuringStartup = loadedDuringStartup;
  }

  /**
   * Returns a json formatted packet of information about this addon
   * @return {string} json string
   */
  get toJson() {
    return {
      name: this.name,
      description: this.description,
      version: this.version,
      repository: this.repository,
      status: this.Status,
      hasStaticContent: this.hasStaticContent
    };
  }

  /**
   * Formats current status into a human readable string
   * @return {string} string representing current state
   */
  get Status() {
    const state = Object.keys(STATES).find(key => STATES[key] === this._status.state);
    const phase = Object.keys(PHASES).find(key => PHASES[key] === this._status.phase);

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
      const meta = {state: this.Status};
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }

    // Load module for the addon
    logger.debug(`[${this.name}] Loading addon.`);
    this._status = {state: STATES.load, phase: PHASES.inProgress};
    return Addon._loadAddonModule(this)
      .then((AddonModule) => { this.Module = AddonModule; })
      .catch((error) => {
        this._status.phase = PHASES.failed;
        return Promise.reject(error);
      });
  }

  /**
   * Creates new instance from the loaded module. This finishes the loading procedure
   * @param {Object} app - instance of express app, provided for backwards compatability
   * @param {Object} server - instance of http/https server that the addon can use
   * @param {Object} socketIO - instance of socket.io
   * @return {Promise} promise to create an instance of the addon
   */
  createInstance(app, server, socketIO) {
    logger.debug(`[${this.name}] Creating addon instance.`);
    return (new Promise((resolve) => {
      this.instance = new this.Module(app, server, socketIO);
      this._status.phase = PHASES.done;
      resolve();
    }))
      .catch((error) => {
        this._status.phase = PHASES.failed;

        const errorMsg = `[${this.name}] Load failed.`;
        const meta = {message: error.message};
        const editedError = error;
        editedError.message = global.createErrorMessage(errorMsg, meta);
        return Promise.reject(editedError);
      });
  }

  /**
   * Registers the addon to the current server, if addon needs static resources
   * the server will need to restart before those become available
   * @param {Object} app - instance of app that is used to introduce static paths
   * @param {DynamicRouter} dynamicRouter - instance of custom router that can be joined and left without problems
   * @return promise to register the addon if possible
   */
  register(app, dynamicRouter) {
    if (!this.isLoaded || this.isRegistered || this.isBusy) {
      const error = `[${this.name}] Cannot register addon.`;
      const meta = {state: this.Status};
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }

    if (this.Module.disabled) {
      return Promise.reject();
    }

    logger.debug(`[${this.name}] Registering addon.`);
    this._status = {state: STATES.register, phase: PHASES.inProgress};

    return new Promise(resolve =>
      resolve(this.instance.register()))
      .then(() => {
        this._registerStaticPath(app);
        this._registerRouter(dynamicRouter);

        this._status.phase = PHASES.done;
      }).catch((error) => {
        this._status.phase = PHASES.failed;

        const errorMsg = `[${this.name}] Register failed.`;
        const meta = {message: error.message};
        const editedError = error;
        editedError.message = global.createErrorMessage(errorMsg, meta);
        return Promise.reject(editedError);
      });
  }

  /**
   * Registers this addon to the list of routers in the DynamicRouter
   */
  _registerRouter(dynamicRouter) {
    if (this.instance.router) {
      dynamicRouter.addonRouters.push({
        addon: this,
        router: this.instance.router
      });
    }
  }

  /**
   * Registers this addons static content to the server,
   * but only if this addon has been loaded at startup
   */
  _registerStaticPath(app) {
    if (this.instance.staticPath) {
      this.hasStaticContent = true;

      // Can only load static content during startup
      // otherwise it will be overridden by error route
      if (this.loadedDuringStartup) {
        const folderPath = path.join(this.addonPath, this.instance.staticPath.folder);
        app.use(this.instance.staticPath.prefix, express.static(folderPath));
      }
    }
  }

  /**
   * Unregisters the addon from the server, if addon has static resources
   * the server will have to restart before those resources are freed
   * @param {DynamicRouter} dynamicRouter - instance of custom router that can be joined and left without problems
   * @return {Promise} promise to unregister the addon if possible
   */
  unregister(dynamicRouter) {
    if (this._status.state !== STATES.register || this.isBusy) {
      const error = `[${this.name}] Cannot unregister addon.`;
      const meta = {state: this.Status};
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }

    logger.debug(`[${this.name}] Unregistering addon.`);
    this._status = {state: STATES.unregister, phase: PHASES.inProgress};
    return new Promise(resolve => resolve(this.instance.unregister()))
      .then(() => {
        // Remove this addon from the router list
        dynamicRouter.removeRouter(this);
        this._status = {state: STATES.load, phase: PHASES.done};
      }).catch((error) => {
        // We cannot assume that addon is still registered, we can't really say anything at this point
        this._status.phase = PHASES.failed;
        const errorMsg = `[${this.name}] Unregister failed.`;
        const meta = {message: error.message};
        return Promise.reject(new Error(global.createErrorMessage(errorMsg, meta)));
      });
  }

  /**
   * Performs the actions needed to load a module
   * Note: addon reference is needed because promises tend to mess up the
   *       reference to "this" variable
   * @param {Addon} addon - instance of an addon
   * @return {Promise} promise to require and resolve a module
   */
  static _loadAddonModule(addon) {
    const editedAddon = addon;
    return Addon._requirePackageFile(addon)
      // Install dependencies and ensure that they are installed
      .then((packageFile) => {
        editedAddon.description = packageFile.description;
        editedAddon.version = packageFile.version;
        editedAddon.repository = packageFile.repository;

        return Addon._installDependencies(editedAddon)
          .then(() => Addon._checkDependencies(editedAddon, packageFile.dependencies || {}));
      })
      .catch((error) => {
        if (error.canContinue) { // If this error is from require package file, it will have this property
          logger.warn(error.message);
          return Promise.resolve(); // package.json error is not fatal and often not a problem
        }
        return Promise.reject(error);
      })
      // Finally require the module
      .then(() => Addon._requireModule(editedAddon));
  }

  /**
   * Install dependencies in addon with npm install
   * @param {Addon} addon - instance of an addon
   * @return {Promise} promise to install dependencies eventually
   */
  static _installDependencies(addon) {
    const command = 'npm install';

    logger.debug(`[${addon.name}] npm installing, working directory: ${addon.addonPath}.`);
    return exec(command, {cwd: addon.addonPath}).then(([stdout, stderr]) => {
      logger.debug(`[${addon.name}] npm finished.`);
      logger.verbose(`STDOUT - "${command}"\n${stdout}`);
      logger.verbose(`STDERR - "${command}"\n${stderr}`);
    });
  }

  /**
   * Ensures all dependencies in the provided dependency object,
   * throws error if package cannot be resolved
   * @param {Addon} addon - instance of an addon
   * @param {Object} dependencies - object containing key value pairs of dependencies
   * @return {Promise} promise to check dependencies
   */
  static _checkDependencies(addon, dependencies) {
    // Change require context to addons context
    module.paths.push(path.join(addon.addonPath, 'node_modules'));

    const dependencyKeys = Object.keys(dependencies);
    return Promise.all(dependencyKeys.map(dependency => Addon._checkDependency(addon, dependency)))
      .then(() => module.paths.pop());
  }

  /**
   * Ensures that a single dependency can be resolved
   * @param {Addon} addon - instance of an addon
   * @param {string} dependency - name of a dependency
   * @return {Promise} promise to try and resolve the dependency
   */
  static _checkDependency(addon, dependency) {
    return new Promise(resolve => resolve(require.resolve(dependency)))
      .catch((error) => {
        const errorMsg = `[${addon.name}] Could not resolve dependency.`;
        const meta = {
          dependency: dependency,
          message: error.message
        };
        logger.warn(global.createErrorMessage(errorMsg, meta));
        return Promise.resolve();
      });
  }

  /**
   * Attemps to require a package file from addon folder,
   * resolves the parsed contents of the file if successful
   * @param {Addon} addon - instance of an addon
   * @returns {Promise} promise that resolves parsed contents of a package.json file
   */
  static _requirePackageFile(addon) {
    const addonPackageFilePath = path.join(addon.addonPath, 'package.json');

    return new Promise(resolve => resolve(require(addonPackageFilePath))) // eslint-disable-line
      .catch((error) => {
        const errorMsg = `[${addon.name}] Failed to require package.json.`;
        const meta = {
          filepath: path.relative('.', addonPackageFilePath),
          message: error.message
        };
        const editedError = error;
        editedError.message = global.createErrorMessage(errorMsg, meta);
        editedError.canContinue = true;
        return Promise.reject(editedError);
      });
  }

  /**
   * Attemps to require a module, addon needs a valid index.js for this to work
   * @param {Addon} addon - instance of an addon
   * @return {Promise} promise that resolves a module from the addon folder
   */
  static _requireModule(addon) {
    return new Promise((resolve) => {
      // disable eslint because we need dynamic require for addons
      const AddonModule = require(addon.addonPath); // eslint-disable-line
      resolve(AddonModule);
    }).catch((error) => {
      const errorMsg = `[${addon.name}] Failed to require module.`;
      const meta = {
        filepath: path.relative('.', addon.addonPath),
        message: error.message
      };
      const editedError = error;
      editedError.message = global.createErrorMessage(errorMsg, meta);
      return Promise.reject(editedError);
    });
  }
}


module.exports = {
  Addon,
  states: STATES,
  phases: PHASES
};
