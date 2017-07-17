/* global describe beforeEach it */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const logger = require('winston');
const path = require('path');

logger.level = 'error';

const expect = chai.expect;
chai.use(chaiAsPromised);

const cachePath = path.resolve('./app/addons/addon.js');

let Addon;
let addon;
let addonPrototype;

describe('addon.js', function () {
  beforeEach(function (done) {
    delete require.cache[cachePath];
    Addon = require('../../../app/addons/addon'); // eslint-disable-line

    addon = new Addon('naim', true);
    addon.addonPath = path.join(__dirname, 'mocking');

    addonPrototype = Object.getPrototypeOf(addon);
    done();
  });

  describe('toJson', function () {
    it('toJson - uncorrupted addon', function (done) {
      addon.description = 'description data';
      addon.version = 'version data';
      addon.repository = 'repository of addon';
      addon.hasStaticContent = false;

      const jsonData = addon.toJson;
      expect(jsonData).to.have.property('description', 'description data');
      expect(jsonData).to.have.property('version', 'version data');
      expect(jsonData).to.have.property('repository', 'repository of addon');
      expect(jsonData).to.have.property('status', 'introduce-done');
      expect(jsonData).to.have.property('hasStaticContent', false);

      done();
    });
  });

  describe('Status', function () {
    it('Status - valid state', function (done) {
      addon._status = { state: 1, phase: 2 };
      expect(addon.Status).to.equal('load-failed');
      done();
    });
  });

  describe('isBusy', function () {
    it('isBusy - true and false case', function (done) {
      addon._status = { state: 0, phase: 1 };
      expect(addon.isBusy).to.equal(false, 'not busy addon should return false.');

      addon._status.phase = 0;
      expect(addon.isBusy).to.equal(true, 'busy addon should return true');

      done();
    });
  });

  describe('isLoaded', function () {
    it('isLoaded - valid state', function (done) {
      addon._status = { state: 1, phase: 1 };
      expect(addon.isLoaded).to.equal(true, 'loaded addon should return true');

      addon._status = { state: 0, phase: 2 };
      expect(addon.isLoaded).to.equal(false, 'unloaded addon should return false');

      done();
    });
  });

  describe('isRegistered', function () {
    it('isRegistered - valid state', function (done) {
      addon._status = { state: 2, phase: 1 };
      expect(addon.isRegistered).to.equal(true, 'registered addon should return true');

      addon._status = { state: 2, phase: 2 };
      expect(addon.isRegistered).to.equal(false, 'unregistered addon should return false');

      done();
    });
  });

  describe('safeToRemove', function () {
    it('isRegistered - valid state', function (done) {
      addon._status = { state: 1, phase: 1 };
      expect(addon.safeToRemove).to.equal(true, 'safe to remove addon should return true');

      addon._status = { state: 2, phase: 1 };
      expect(addon.safeToRemove).to.equal(false, 'unsafe to remove addon should return false');

      done();
    });
  });

  describe('loadModule', function () {
    it('loadModule - correct state, no errors', function () {
      global.createErrorMessage = error => Promise.reject(error);

      addonPrototype.constructor._loadAddonModule = () => Promise.resolve('module');
      return addon.loadModule()
      .then(() => {
        delete global.createErrorMessage;

        expect(addon).to.have.property('Module', 'module');
        expect(addon).to.have.property('_status');
        expect(addon._status).to.have.property('state', 1);
        expect(addon._status).to.have.property('phase', 0);
        return Promise.resolve();
      });
    });
  });

  describe('createInstance', function () {
    it('createInstance - correct state, no errors', function () {
      global.createErrorMessage = error => Promise.reject(error);

      addon.Module = function (pServer, pSocketIO) {
        this.server = pServer;
        this.socketIO = pSocketIO;
      };

      // Should be in load state at this point
      addon._status.state = 1;

      return addon.createInstance('server', 'socket')
      .then(() => {
        delete global.createErrorMessage;

        expect(addon).to.have.property('instance');
        expect(addon.instance).to.have.property('server', 'server');
        expect(addon.instance).to.have.property('socketIO', 'socket');

        expect(addon).to.have.property('_status');
        expect(addon._status).to.have.property('state', 1);
        expect(addon._status).to.have.property('phase', 1);
      });
    });
  });

  describe('register', function () {
    it('register - valid register sequence', function () {
      global.createErrorMessage = error => Promise.reject(error);

      addon._status = { state: 1, phase: 1 };
      addon.Module = { disabled: false };
      addon.instance = { register: () => Promise.resolve() };

      addon._registerRouter = (pDynamicRouter) => {
        addon.t_dynamicRouter = pDynamicRouter;
      };
      addon._registerStaticPath = (pApp) => {
        addon.t_pApp = pApp;
      };

      return addon.register('app', 'dynamic_router')
      .then(() => {
        delete global.createErrorMessage;

        // Addon should have called both of the overwritten functions
        expect(addon).to.have.property('t_dynamicRouter', 'dynamic_router');
        expect(addon).to.have.property('t_pApp', 'app');

        expect(addon).to.have.property('_status');
        expect(addon._status).to.have.property('state', 2);
        expect(addon._status).to.have.property('phase', 1);
        return Promise.resolve();
      });
    });
  });

  describe('_registerRouter', function () {
    it('_registerRouter - instance has router', function (done) {
      global.createErrorMessage = error => Promise.reject(error);

      addon.instance = { router: 'router' };

      const dynamicRouter = { addonRouters: ['mock router'] };
      addon._registerRouter(dynamicRouter);

      expect(dynamicRouter.addonRouters[1]).to.have.property('router', 'router');
      delete global.createErrorMessage;
      done();
    });
  });

  describe('_registerStaticPath', function () {
    it('_registerStaticPath - has static path', function (done) {
      global.createErrorMessage = error => Promise.reject(error);

      addon.instance = { staticPath: { prefix: 'path_prefix', folder: 'static_path' } };

      const app = { use: (pPrefix, pFolder) => {
        expect(pPrefix).to.equal('path_prefix');
        expect(pFolder).to.be.a('Function');
      } };

      addon._registerStaticPath(app);
      delete global.createErrorMessage;
      done();
    });
  });

  describe('unregister', function () {
    it('unregister - ', function () {
      global.createErrorMessage = error => Promise.reject(error);

      addon._status = { state: 2, phase: 1 };
      addon.instance = { unregister: () => Promise.resolve() };

      let removeRouterCalled = false;
      const dynamicRouter = { removeRouter: () => { removeRouterCalled = true; } };

      return addon.unregister(dynamicRouter)
      .then(() => {
        delete global.createErrorMessage;

        expect(removeRouterCalled).to.equal(true, 'removeRouter should be called during successful unregister');

        expect(addon).to.have.property('_status');
        expect(addon._status).to.have.property('state', 1);
        expect(addon._status).to.have.property('phase', 1);
        return Promise.resolve();
      });
    });
  });

  describe('_loadAddonModule', function () {
    it('_loadAddonModule', function () {
      global.createErrorMessage = error => Promise.reject(error);

      addonPrototype.constructor._requirePackageFile = () => Promise.resolve(
        { description: 'desc', version: 'version', repository: 'repo' });

      let installCalled = false;
      addonPrototype.constructor._installDependencies = () => {
        installCalled = true;
        return Promise.resolve();
      };

      let checkCalled = false;
      addonPrototype.constructor._checkDependencies = () => {
        checkCalled = true;
        return Promise.resolve();
      };

      let requireCalled = false;
      addonPrototype.constructor._requireModule = () => {
        requireCalled = true;
        return Promise.resolve();
      };

      return addonPrototype.constructor._loadAddonModule(addon)
      .then(() => {
        delete global.createErrorMessage;

        expect(installCalled).to.equal(true);
        expect(checkCalled).to.equal(true);
        expect(requireCalled).to.equal(true);

        expect(addon).to.have.property('description', 'desc');
        expect(addon).to.have.property('version', 'version');
        expect(addon).to.have.property('repository', 'repo');
      });
    });
  });

  describe('_installDependencies', function () {
    it.skip('_installDependencies', function (done) {
      // TODO actually test that a command is executed
      done();
    });
  });

  describe('_checkDependencies', function () {
    it('_checkDependencies - resolvable dependencies', function () {
      // List of dependencies that should resolve to something
      const dependencies = { fs: undefined, path: undefined };
      return addonPrototype.constructor._checkDependencies(addon, dependencies);
    });
  });

  describe('_checkDependency', function () {
    global.createErrorMessage = error => Promise.reject(error);

    it('_checkDependency - valid dependency', function () {
      const dependency = 'fs';
      return addonPrototype.constructor._checkDependency(addon, dependency)
      .then(() => {
        delete global.createErrorMessage;
      });
    });
  });

  describe('_requirePackageFile', function () {
    it('_requirePackageFile', function () {
      global.createErrorMessage = error => Promise.reject(error);

      return addonPrototype.constructor._requirePackageFile(addon)
      .then((pPackage) => {
        delete global.createErrorMessage;
        expect(pPackage).to.have.property('data', 'dummy data');
      });
    });
  });

  describe('_requireModule', function () {
    it('_requireModule', function () {
      global.createErrorMessage = error => Promise.reject(error);

      return addonPrototype.constructor._requireModule(addon)
      .then((pModule) => {
        delete global.createErrorMessage;
        expect(pModule).to.equal('dummy module');
      });
    });
  });
});
