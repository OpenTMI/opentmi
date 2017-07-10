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

function createErrorMessage(pError, pMetaInfo, pSolution) {
  let combinedError = pError;

  // Append meta data lines
  for (let i = 0; i < pMetaInfo.length; i += 1) {
    if (i !== pMetaInfo.length - 1) {
      combinedError += `\n ├ ${pMetaInfo[i]}`;
    } else {
      combinedError += `\n ├ ${pMetaInfo[i]}`;
    }
  }

  // If proposed solution exists, add it
  if (pSolution) {
    combinedError += `\n └ Solution: ${pSolution}`;
  }

  return combinedError;
}

class Addon {
  constructor(name) {
    this.name = name;
    this.status = { state: STATES.introduce, phase: PHASES.done };
  }

  get Status() {
    const state = Object.keys(STATES).find(key => STATES[key] === this.status.state);
    const phase = Object.keys(PHASES).find(key => PHASES[key] === this.status.phase);

    return `${state}-${phase}`;
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
      const error = 'Cannot load module for addon';
      const meta = { addon_name: this.name, state: this.Status };
      const solution = 'Addon is either already loaded or in progress';
      return Promise.reject(new Error(createErrorMessage(error, meta, solution)));
    }

    logger.debug(`loading module for addon: ${this.name}`);
    this.status.state = { state: STATES.load, phase: PHASES.inProgress };
    return Addon._loadAddonModule(this.name)
    .then((AddonModule) => {
      this.status.phase = PHASES.done;
      this.Module = AddonModule;
      this.status = { state: 0, phase: PHASES.done };
    })
    .catch((error) => {
      this.status.phase = PHASES.failed;
      return Promise.reject(error);
    });
  }

  createInstance(app, server, io) {
    if (this.status.state !== STATES.load || this.status.state === PHASES.inProgress) {
      const error = 'Cannot create instance for addon';
      const meta = { addon_name: this.name, state: this.Status };
      const solution = 'Check that addon is loaded';
      return Promise.reject(new Error(createErrorMessage(error, meta, solution)));
    }

    logger.debug(`Instantiating addon: ${this.name}`);
    this.status.state = { state: STATES.instantiate, phase: PHASES.inProgress };
    try {
      this.instance = new this.Module(app, server, io);
      this.status.phase = PHASES.done;
    } catch (pError) {
      this.status.phase = PHASES.failed;
      const error = 'Failed to instantiate addon';
      const meta = { filename: this.name, Error: pError.message };
      throw new Error(createErrorMessage(error, meta));
    }

    return undefined;
  }

  register() {
    if (this.status.state !== STATES.instantiate || this.status.phase === PHASES.inProgress) {
      const error = 'Cannot register addon';
      const meta = [`addon name: ${this.name}`, `state: ${this.Status}`];
      const solution = 'Check that addon is loaded and not yet registered';
      return Promise.reject(new Error(createErrorMessage(error, meta, solution)));
    }

    if (this.Module.disabled) {
      return Promise.reject('This addon is disabled');
    }

    logger.debug(`Registering addon: ${this.name}`);
    this.status.state = { state: STATES.register, phase: PHASES.inProgress };
    return this.instance.register().then(() => {
      this.registered = true;
      this.status.phase = PHASES.done;
    }).catch((pError) => {
      this.registered = false;
      this.status.phase = PHASES.failed;
      const error = 'Failed to register addon';
      const meta = [`Filename: ${this.name}`, `Error   : ${pError.message}`.red];
      return Promise.reject(new Error(createErrorMessage(error, meta)));
    });
  }

  unregister() {
    if (this.status.state !== STATES.unregister || this.status.phase === PHASES.inProgress) {
      const error = 'Cannot unregister addon';
      const meta = [`addon name: ${this.name}`, `state: ${this.Status}`];
      const solution = 'Check that addon is registered before unregistering';
      return Promise.reject(new Error(createErrorMessage(error, meta, solution)));
    }

    logger.debug(`Unregistering addon: ${this.name}`);
    this.status = { state: STATES.unregister, phase: PHASES.inProgress };
    return this.instance.unregister().then(() => {
      this.registered = false;
      this.status.phase = PHASES.done;
    }).catch((pError) => {
      // We cannot assume that addon is still registered, we can't really say anything at this point
      this.registered = false;
      this.status.phase = PHASES.failed;
      const error = 'Failed to unregister addon';
      const meta = [`Filename: ${this.name}`, `Error   : ${pError.message}`.red];
      return Promise.reject(new Error(createErrorMessage(error, meta)));
    });
  }

  static _loadAddonModule(file) {
    logger.debug(` * file: ${file}`);
    const addonModulePath = path.join(__dirname, file);

    // Try to load package json for dependencies
    return Addon._requirePackageFile(file, path.join(addonModulePath, 'package.json'))

    // Ensure addons dependencies are installed
    .then((addonPackageFile) => {
      const dependencies = addonPackageFile.dependencies || {};
      if (!dependencies.every(file, Addon._dependencyMet)) {
        const errorMessage = 'Could not load all dependencies.';
        return Promise.reject(new Error(errorMessage));
      }

      return Promise.resolve();
    })

    // Load the addon module
    .then(() => Addon._requireModule(file, addonModulePath))

    // Catch things that go wrong with the loading process
    .catch((pError) => {
      pError.message = `Addon loading failed: ${file.cyan}.\n${pError.message}`;
      return Promise.reject(pError);
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

  static _requirePackageFile(pName, pAddonPackageFilePath) {
    const promiseToRequire = (new Promise((resolve) => {
      const packageJson = require(addonPackageFilePath); // eslint-disable-line
      resolve(packageJson);
    })).catch((pError) => {
      const error = 'Could not require addon package.json';
      const meta = [`Filename: ${pName}`, `Filepath: ${pAddonPackageFilePath}`, `Error   : ${pError.message}`.red];
      const solution = 'ensure that path exists and has no syntax errors';
      return Promise.reject(new Error(createErrorMessage(error, meta, solution)));
    });
    return promiseToRequire;
  }

  static _requireModule(pName, pModulePath) {
    const promiseToRequire = (new Promise((resolve) => {
      const AddonModule = require(modulePath); // eslint-disable-line
      resolve(AddonModule);
    })).catch((pError) => {
      const relativeAddonPath = path.relative('.', pModulePath);
      const error = 'Could not require addon';
      const meta = [`Filename: ${pName}`, `Filepath: ${relativeAddonPath}`, `Error   : ${pError.message}`.red];
      const solution = 'ensure that path exists and module has no syntax errors';
      return Promise.reject(new Error(createErrorMessage(error, meta, solution)));
    });
    return promiseToRequire;
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
      return newAddon.loadModule(file).catch((pError) => {
        logger.warn(pError.message);
        logger.debug(pError.stack);
      });
    }));
  }

  registerAddons() {
    logger.info('Registering addons...');

    // Promise to register all addons
    const registerPromises = this.addons.filter((addon) => {
      return addon.status.state === STATES.load && addon.status.phase === PHASES.done;
    }).map((addon) => {
      addon.createInstance(this.app, this.server, this.io);
      return addon.register().catch((pError) => {
        logger.warn(pError.message);
      });
    });

    return Promise.all(registerPromises);
  }

  registerAddon(index) {
    if (index < this.addons.length) {
      const addon = this.addons(index);
      logger.info(`Registering module: {${addon.name}}`);
      return addon.register();
    }

    const error = 'Cannot register addon with out of scope index';
    const meta = [`Index      : ${index}`, `Addon count: ${this.addons.length}`];
    return Promise.reject(new Error(createErrorMessage(error, meta)));
  }

  unregisterAddon(index) {
    if (index < this.addons.length) {
      const addon = this.addons(index);
      logger.info(`Unregistering module: {${addon.name}}`);
      return addon.unregister();
    }

    const error = 'Cannot unregister addon with out of scope index';
    const meta = [`Index      : ${index}`, `Addon count: ${this.addons.length}`];
    return Promise.reject(new Error(createErrorMessage(error, meta)));
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
        const meta = [`current status: ${addon.Status}`];
        const solution = 'wait for the addon to finish, or just use force remove.';
        return Promise.reject(new Error(createErrorMessage(error, meta, solution)));
      } else if (addon.status.state === STATES.register) {
        // Addon is registered, should unregister before removing
        const error = `Warning, should not remove addon: ${addon.name}.`;
        const meta = `current status: ${addon.Status}`;
        const solution = 'please unregister the addon before removing, or just use force remove';
        return Promise.reject(new Error(createErrorMessage(error, meta, solution)));
      }

      // Expect the unexpected
      return Promise.reject(new Error('Unexpected failure of removeAddon'));
    }

    const error = 'Cannot remove module with out of scope index';
    const meta = [`Index      : ${index}`, `Addon count: ${this.addons.length}`];
    return Promise.reject(new Error(createErrorMessage(error, meta)));
  }

  // Api methods
  listAddons(req, res) {
    const addonList = [];
    this.addons.forEach((addon) => {
      addonList.push(addon);
    });
    res.json(addonList);
  }

  // Add new addon
  
}

module.exports = AddonManager;
