require('colors');

// native modules
const path = require('path');

// 3rd party modules
const logger = require('winston');

const STATES = { introduce: 0, load: 1, instantiate: 2, register: 3, unregister: 4 };
const PHASES = { inProgress: 0, done: 1, failed: 2 };

/**
 * Data structure for addon that is responsible for keeping track of the current status
 * @todo possibly count size of addon to spot rogue addons
 * @todo timeout for addon loading
 */
class Addon {
  constructor(name) {
    this.name = name;
    this.status = { state: STATES.introduce, phase: PHASES.done };
  }

  get Json() {
    return JSON.stringify({ name: this.name, status: this.Status });
  }

  get Status() {
    const state = Object.keys(STATES).find(key => STATES[key] === this.status.state);
    const phase = Object.keys(PHASES).find(key => PHASES[key] === this.status.phase);

    return `${state}-${phase}`;
  }

  get isBusy() {
    return this.status.phase === PHASES.inProgress;
  }

  get isLoaded() {
    return (this.status.state === STATES.load) &&
           (this.status.phase === PHASES.done);
  }

  get isInstantiated() {
    return (this.status.state === STATES.instantiate) &&
           (this.status.phase === PHASES.done);
  }

  get isRegistered() {
    return (this.status.state === STATES.register) &&
           (this.status.phase === PHASES.done);
  }

  get safeToRemove() {
    return !this.isRegistered && !this.isBusy;
  }

  loadModule() {
    if (this.status.state !== STATES.introduce || this.isBusy) {
      const error = 'Cannot load module for addon';
      const meta = {
        addon_name: this.name,
        state: this.Status,
        solution: 'Addon is either already loaded or in progress'
      };
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }

    logger.debug(`loading module for addon: ${this.name}`);
    this.status = { state: STATES.load, phase: PHASES.inProgress };
    return Addon._loadAddonModule(this.name)
    .then((AddonModule) => {
      this.Module = AddonModule;
      this.status.phase = PHASES.done;
    })
    .catch((error) => {
      this.status.phase = PHASES.failed;
      return Promise.reject(error);
    });
  }

  createInstance(app, server, io) {
    if (this.status.state !== STATES.load || this.isBusy) {
      const error = 'Cannot create instance for addon';
      const meta = {
        addon: this.name,
        state: this.Status,
        solution: 'Check that addon is loaded'
      };
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }

    logger.debug(`Instantiating addon: ${this.name}`);
    this.status = { state: STATES.instantiate, phase: PHASES.inProgress };
    try {
      this.instance = new this.Module(app, server, io);
      this.status.phase = PHASES.done;
    } catch (pError) {
      this.status.phase = PHASES.failed;
      const error = 'Failed to instantiate addon';
      const meta = {
        addon: this.name,
        message: pError.message
      };
      throw new Error(global.createErrorMessage(error, meta));
    }

    return undefined;
  }

  register() {
    if (this.status.state !== STATES.instantiate || this.isBusy) {
      const error = 'Cannot register addon';
      const meta = {
        addon_name: this.name,
        state: this.Status,
        solution: 'Check that addon is loaded and not yet registered'
      };
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }

    if (this.Module.disabled) {
      return Promise.reject('This addon is disabled');
    }

    logger.debug(`Registering addon: ${this.name}`);
    this.status = { state: STATES.register, phase: PHASES.inProgress };
    try {
      return this.instance.register().then(() => {
        this.registered = true;
        this.status.phase = PHASES.done;
      }).catch((pError) => {
        this.registered = false;
        this.status.phase = PHASES.failed;
        const error = `Register raised an error`;
        const meta = { addon: this.name, message: pError.message };
        return Promise.reject(new Error(global.createErrorMessage(error, meta)));
      });
    } catch (pError) {
      const error = 'Error thrown outside of promise while registering block.';
      const meta = {
        addon: this.name,
        message: pError.message,
        solution: 'Addon probably defined wrongly, check that register returns a promise.'
      };
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }
  }

  unregister() {
    if (this.status.state !== STATES.register || this.isBusy) {
      const error = 'Cannot unregister addon';
      const meta = {
        addon_name: this.name,
        state: this.Status,
        solution: 'Check that addon is registered before unregistering'
      };
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }

    logger.debug(`Unregistering addon: ${this.name}`);
    this.status = { state: STATES.unregister, phase: PHASES.inProgress };
    try {
      return this.instance.unregister().then(() => {
        this.registered = false;
        this.status.phase = PHASES.done;
      }).catch((pError) => {
        // We cannot assume that addon is still registered, we can't really say anything at this point
        this.registered = false;
        this.status.phase = PHASES.failed;
        const error = 'Failed to unregister addon';
        const meta = { filename: this.name, message: pError.message };
        return Promise.reject(new Error(global.createErrorMessage(error, meta)));
      });
    } catch (pError) {
      const error = 'Error thrown outside of promise while unregistering block.';
      const meta = {
        addon: this.name,
        message: pError.message,
        solution: 'Addon probably defined wrongly, check that unregister returns a promise.'
      };
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    }
  }

  static _loadAddonModule(file) {
    logger.debug(` * file: ${file}`);
    const addonModulePath = path.join(__dirname, file);

    // Try to load package json for dependencies
    return Addon._requirePackageFile(file, path.join(addonModulePath, 'package.json'))

    // package.json error is not fatal and often not a problem
    .catch((pError) => {
      logger.warn(pError.message);
      return Promise.resolve({});
    })

    // Ensure addons dependencies are installed
    .then((addonPackageFile) => {
      const dependencies = addonPackageFile.dependencies || {};
      Object.keys(dependencies).forEach(dependency => Addon._checkDependency(file, dependency));
    })

    // Load the addon module
    .then(() => Addon._requireModule(file, addonModulePath))

    // Catch things that go wrong with the loading process
    .catch((pError) => {
      pError.message = `Addon loading failed: ${file}.\n${pError.message}`;
      return Promise.reject(pError);
    });
  }

  static _checkDependency(pName, dependency) {
    // Change require context to addons context
    const addonPath = path.join(module.paths[module.paths.length - 1], pName);
    module.paths.push(addonPath);
    logger.debug(`Addon path: ${addonPath}`);

    // Try to resolve the dependency
    try {
      require.resolve(dependency);
      return undefined;
    } catch (e) {
      const error = 'Dependency not found.';
      const meta = {
        addon: pName,
        dependency,
        solution: 'Check that dependencies are installed during load'
      };
      throw new Error(global.createErrorMessage(error, meta));
    }
  }

  static _requirePackageFile(pName, pAddonPackageFilePath) {
    const promiseToRequire = (new Promise((resolve) => {
      const packageJson = require(pAddonPackageFilePath); // eslint-disable-line
      resolve(packageJson);
    })).catch((pError) => {
      const error = 'Failed to require package.json';
      const meta = {
        addon: pName,
        filepath: path.relative('.', pAddonPackageFilePath),
        message: pError.message,
        solution: 'Ensure that package.json exists and has no syntax errors.'
      };
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    });
    return promiseToRequire;
  }

  static _requireModule(pName, pModulePath) {
    const promiseToRequire = (new Promise((resolve) => {
      // disable eslint because we need dynamic require for addons
      const AddonModule = require(pModulePath); // eslint-disable-line
      resolve(AddonModule);
    })).catch((pError) => {
      const error = 'Failed to require module';
      const meta = {
        addon: pName,
        filepath: path.relative('.', pModulePath),
        message: pError.message,
        solution: 'Ensure that addon directory has index.js and module has no syntax errors.'
      };
      return Promise.reject(new Error(global.createErrorMessage(error, meta)));
    });
    return promiseToRequire;
  }
}


module.exports = Addon;
