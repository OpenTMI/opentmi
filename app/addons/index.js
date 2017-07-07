// native modules
const fs = require('fs');
const path = require('path');

// 3rd party modules
const logger = require('winston');

process.on('warning', (warn) => {
  console.log(warn.stack);
});

const STATES = { introduce: 0, load: 1, instantiate: 2, register: 3, unregister: 4 };
const PHASES = { inProgress: 0, done: 1, failed: 2 };

function createErrorMessage(error, metaInfo, solution) {
  let combinedError = error;
  for (let i = 0; i < metaInfo.length; i += 1) {
    if (i !== metaInfo.length - 1) {
      combinedError += `\n ├ ${metaInfo[i]}`;
    } else {
      combinedError += `\n ├ ${metaInfo[i]}`;
    }
  }
  combinedError += `\n └ Solution: ${solution}`;
  return combinedError;
}

class Addon {
  constructor(name) {
    this.name = name;
    this.status = { state: STATES.introduce, phase: PHASES.done };
  }

  get Status() {
    return `${this.status.state}-${this.status.phase}`;
  }

  get isRegistered() {
    return this.status.state === STATES.register && this.status.phase === PHASES.done;
  }

  get safeToRemove() {
    return (this.status.state !== STATES.registered) &&
           (this.status.phase !== PHASES.inProgress);
  }

  loadModule() {
    if (this.status.state !== STATES.introduce || this.status.phase === PHASES.inProgress) {
      return Addon._wrongStatusError(
        `cannot load module for addon: ${this.name}, invalid current state.\n └ state: ${this.status}`);
    }

    logger.debug(`loading module for addon: ${this.name}`);
    this.status.state = { state: STATES.load, phase: PHASES.inProgress };
    return AddonManager._loadAddonModule(this.name)
    .then((AddonModule) => {
      this.status.phase = PHASES.done;
      this.Module = AddonModule;
      this.status = { state: 0, phase: PHASES.done };
    })
    .catch(() => {
      this.status.phase = PHASES.failed;
    });
  }

  createInstance(app, server, io) {
    if (this.status.state !== STATES.load || this.status.state === PHASES.inProgress) {
      return Addon._wrongStatusError(
        `cannot create instance for addon: ${this.name}, invalid current state.\n └ state: ${this.Status}.`);
    }

    logger.debug(`Instantiating addon: ${this.name}`);
    this.status.state = { state: STATES.instantiate, phase: PHASES.inProgress };
    try {
      this.instance = new this.Module(app, server, io);
      this.status.phase = PHASES.done;
    } catch (error) {
      this.status.phase = PHASES.failed;
      logger.warn(`failed to instantiate addon: ${this.name}.\n └ ${error.toString()}`);
    }

    return undefined;
  }

  register() {
    if (this.status.state !== STATES.instantiate || this.status.phase === PHASES.inProgress) {
      return Addon._wrongStatusError(
        `cannot register addon: ${this.name}, invalid current state.\n └ state: ${this.Status}.`);
    }

    logger.debug(`Registering addon: ${this.name}`);
    this.status.state = { state: STATES.register, phase: PHASES.inProgress };
    return this.instance.register().then(() => {
      this.registered = true;
      this.status.phase = PHASES.done;
    }).catch((error) => {
      this.registered = false;
      this.status.phase = PHASES.failed;
      logger.warn(`failed to register addon: ${this.name}.\n └ ${error.toString()}`);
    });
  }

  unregister() {
    if (this.status.state !== STATES.unregister || this.status.phase === PHASES.inProgress) {
      return Addon._wrongStatusError(
        `cannot unregister addon: ${this.name}, invalid current state.\n └ state: ${this.Status}`);
    }

    logger.debug(`Unregistering addon: ${this.name}`);
    this.status = { state: STATES.unregister, phase: PHASES.inProgress };
    return this.instance.unregister().then(() => {
      this.registered = false;
      this.status.phase = PHASES.done;
    }).catch((error) => {
      // We cannot assume that addon is still registered, we can't really say anything at this point
      this.registered = false;
      this.status.phase = PHASES.failed;
      logger.warn(`failed to unregister addon: ${this.name}.\n └ ${error.toString()}`);
    });
  }

  static _wrongStatusError(msg) {
    logger.warn(msg);
    return Promise.reject(new Error(msg));
  }
}

class AddonManager {
  constructor(app, server, io) {
    this.app = app;
    this.server = server;
    this.io = io;

    this.addons = [];
    app.get('/addons', this.listAddons.bind(this));
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
      return newAddon.loadModule(file);
    }));
  }

  registerAddons() {
    logger.info('Registering addons...');

    // Promise to register all addons
    const registerPromises = this.addons.filter((addon) => {
      // Only register addons that are not disabled
      logger.info(`Addon ${Addon.name} is disabled`);
      return addon.Module && addon.Module.disabled;
    }).map((addon) => {
      addon.createInstance(this.app, this.server, this.io);
      return addon.register();
    });

    return Promise.all(registerPromises);
  }

  _registerAddon(index) {
    if (index < this.addons.length) {
      logger.info(`Registering module: {${this.addons[index].name}}`);
      return this.addons[index].register();
    }

    const errorMessage = `Cannot register module with index: ${index}.\n └ index does not point to an addon in array(size: ${this.addons.length})`;
    logger.warn(errorMessage);
    return Promise.reject(new Error(errorMessage));
  }

  unregisterAddon(index) {
    if (index < this.addons.length) {
      logger.info(`Unregistering module: {${this.addons[index].name}}`);
      return this.addons[index].unregister();
    }

    const error = `Cannot unregister module with index: ${index}.`;
    const cause = `index does not point to an addon in array(size: ${this.addons.length})`;
    const errorMessage = `${error}\n └ ${cause}`;
    logger.warn(errorMessage);
    return Promise.reject(new Error(errorMessage));
  }

  _removeAddon(index, force = false) {
    if (index < this.addons.length) {
      const addon = this.addons[index];

      if (addon.safeToRemove() || force) {
        // Safe to remove this addon
        logger.info(`Removing module: {${addon.name}}`);
        this.addons = this.addons.splice(index, 1);
        return Promise.resolve();
      } else if (addon.status.phase === PHASES.inProgress) {
        // Something is in progress, better not remove
        const error = `Warning, should not remove addon: ${addon.name}.`;
        const meta = `current status: ${addon.Status}`;
        const solution = 'wait for the addon to finish, or just use force remove.';
        const errorMessage = createErrorMessage(error, [meta], solution);
        logger.warn(errorMessage);
        return Promise.reject(new Error(errorMessage));
      } else if (addon.status.state === STATES.register) {
        // Addon is registered, should unregister before removing
        const error = `Warning, should not remove addon: ${addon.name}.`;
        const meta = `current status: ${addon.Status}`;
        const solution = 'please unregister the addon before removing, or just use force remove';
        const errorMessage = createErrorMessage(error, [meta], solution);
        logger.warn(errorMessage);
        return Promise.reject(errorMessage);
      } else {
        // Expect the unexpected
        const errorMessage = 'Unexpected failure of removeAddon';
        logger.error(errorMessage);
        return Promise.reject(errorMessage);
      }
    } else {
      const errorMessage = `Cannot remove module with index: ${index}.\n └ index does not point to an addon in array(size: ${this.addons.length})`;
      logger.warn(errorMessage);
      return Promise.reject(errorMessage);
    }
  }

  // Api methods
  listAddons(req, res) {
    const addonList = [];
    this.addons.forEach((addon) => {
      addonList.push(addon);
    });
    res.json(addonList);
  }

  static _loadAddonModule(file) {
    logger.debug(` * file: ${file}`);
    const addonModulePath = path.join(__dirname, file);

    // Try to load package json for dependencies
    return AddonManager._requirePackageFile(file, path.join(addonModulePath, 'package.json'))

    // Ensure addons dependencies are installed
    .then((addonPackageFile) => {
      const dependencies = addonPackageFile.dependencies || {};
      if (!dependencies.every(file, AddonManager._dependencyMet)) {
        const errorMessage = 'Could not load all dependencies, there should be details of the dependency that failed above.';
        logger.warn(errorMessage);
        throw Error(errorMessage);
      }
    })

    // Load the addon module
    .then(() => AddonManager._requireModule(file, addonModulePath))

    // Catch things that go wrong with the loading process
    .catch((error) => {
      const errorMessage = `Addon loading failed: ${file}`;
      logger.debug(error.toString());
      logger.warn(errorMessage);
    });
  }

  static _dependencyMet(name, dependency) {
    try {
      require.resolve(dependency);
      return true;
    } catch (e) {
      logger.warn(`Npm package(name: ${dependency}) is not found, required by addon(name: ${name})`);
      return false;
    }
  }

  static _requirePackageFile(name, addonPackageFilePath) {
    const promiseToRequire = (new Promise((resolve) => {
      const packageJson = require(addonPackageFilePath); // eslint-disable-line
      resolve(packageJson);
    })).catch((error) => {
      const errorMessage = createErrorMessage(
        'Could not require addon package.json',
        [`filename: ${name}`, `filepath: ${addonPackageFilePath}`, `Error   : ${error.message}`],
        'ensure that path exists and has no syntax errors');
      logger.warn(errorMessage);
      return Promise.reject(Error(errorMessage));
    });
    return promiseToRequire;
  }

  static _requireModule(name, modulePath) {
    const promiseToRequire = (new Promise((resolve) => {
      const AddonModule = require(modulePath); // eslint-disable-line
      resolve(AddonModule);
    })).catch((error) => {
      const relativeAddonPath = path.relative('.', modulePath);
      const errorMessage = createErrorMessage(
        'Could not require addon',
        [`filename: ${name}`, `filepath: ${relativeAddonPath}`, `Error   : ${error.message}`],
        'ensure that path exists and module has no syntax errors');
      logger.error(errorMessage);
      logger.silly(error.stack);
      return Promise.reject(new Error(errorMessage));
    });
    return promiseToRequire;
  }
}

module.exports = AddonManager;
