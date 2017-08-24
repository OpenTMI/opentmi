/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Native components
const path = require('path');

// Third party components
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const mock = require('mock-fs');
const logger = require('winston');

// Local components
const addonMockFiles = require('./mocking/addon-mock-files');

// Setup
logger.level = 'error';
chai.use(chaiAsPromised);

// Test variables
const expect = chai.expect;
const cachePath = path.resolve('./app/addons/index.js');
let AddonManager;

describe('addons/index.js', function () {
  beforeEach(function (done) {
    // Note require calls must be made with unmocked fs... naturally
    delete require.cache[cachePath];
    AddonManager = require('../../../app/addons'); // eslint-disable-line

    mock(addonMockFiles);
    done();
  });

  afterEach(function (done) {
    mock.restore();
    done();
  });

  describe('constructor', function () {
    it('constructor - created successfully', function (done) {
      expect(AddonManager).to.exist; // eslint-disable-line
      expect(AddonManager).to.have.property('addons');
      expect(AddonManager.addons).to.be.a('Array');
      expect(AddonManager.addons).to.be.empty;  // eslint-disable-line
      expect(AddonManager).to.have.property('dynamicRouter');
      done();
    });
  });

  describe('init', function () {
    it('init - valid app, server, and io', function (done) {
      AddonManager.init('appel', 'grunt', 'klapperino');

      expect(AddonManager).to.have.property('app', 'appel');
      expect(AddonManager).to.have.property('server', 'grunt');
      expect(AddonManager).to.have.property('io', 'klapperino');

      done();
    });
  });

  describe('_moduleLoadError', function () {
    it('_moduleLoadError - valid error', function (done) {
      const error = new Error('test error');
      Object.getPrototypeOf(AddonManager).constructor._moduleLoadError({name: 'mock addon'}, 'all failed', error);
      done();
    });
  });

  describe('_recursiveLoad', function () {
    it('_recursiveLoad - 5 addons', function () {
      // Count how many times functions are called
      let loadCalled = 0;
      let instanceCalled = 0;

      // Mock addons interface and everything
      const addons = [];
      const loadModule = () => {
        loadCalled += 1;
        return Promise.resolve();
      };
      const createInstance = () => {
        instanceCalled += 1;
        return Promise.resolve();
      };

      class MockAddon {
        constructor(i) {
          this.name = `Mock addon ${i}`;
          this.loadModule = loadModule.bind(this);
          this.createInstance = createInstance.bind(this);
        }
      }

      for (let i = 0; i < 5; i += 1) {
        addons.push(new MockAddon(i));
      }

      return Object.getPrototypeOf(AddonManager).constructor._recursiveLoad(addons)
        .then(() => {
          expect(loadCalled).to.equal(addons.length, 'load should be called as many times as there are addons.');
          expect(instanceCalled).to.equal(addons.length,
            'create instance should be called as many times as there are addons.');
          return Promise.resolve();
        });
    });
  });

  describe('_asyncLoad', function () {
    it('_asyncLoad -  5 addons', function () {
      // Count how many times functions are called
      let loadCalled = 0;
      let instanceCalled = 0;

      // Mock addons interface and everything
      const addons = [];
      const loadModule = () => {
        loadCalled += 1;
        return Promise.resolve();
      };
      const createInstance = () => {
        instanceCalled += 1;
        return Promise.resolve();
      };

      for (let i = 0; i < 5; i += 1) {
        addons.push({loadModule, createInstance});
      }

      return Object.getPrototypeOf(AddonManager).constructor._recursiveLoad(addons)
        .then(() => {
          expect(loadCalled).to.equal(addons.length, 'load should be called as many times as there are addons.');
          expect(instanceCalled).to.equal(addons.length,
            'create instance should be called as many times as there are addons.');
          return Promise.resolve();
        });
    });
  });

  describe('readAddons', function () {
    // @TODO Do tests
  });

  describe('installAddons', function () {
    // @TODO Do tests
  });

  describe('loadAddons', function () {
    it('loadAddons - recursive 2 valid addons', function () {
      AddonManager.addons = ['addon1', 'addon2'];

      // Mock addon manager
      const addonProto = Object.getPrototypeOf(AddonManager);
      addonProto.constructor._recursiveLoad = (addonArray) => {
        expect(addonArray.length).to.equal(AddonManager.addons.length);
        expect(addonArray).to.have.lengthOf(2);
        return Promise.resolve('finished');
      };
      Object.setPrototypeOf(AddonManager, addonProto);

      return expect(AddonManager.loadAddons(true)).to.eventually.equal('finished');
    });
  });

  describe('registerAddons', function () {
    it('registerAddons - valid addons', function () {
      AddonManager.app = {use: (router) => {
        expect(router).to.be.a('Function');
      }};

      const addons = [
        {register: () => Promise.resolve(), isLoaded: true},
        {register: () => Promise.resolve(), isLoaded: true},
        {register: () => Promise.resolve(), isLoaded: false}
      ];

      AddonManager.addons = addons;
      return AddonManager.registerAddons().then((results) => {
        expect(results).to.have.lengthOf(2);
        return Promise.resolve();
      });
    });
  });

  describe('startJobs', function () {
    // @TODO Do tests
  });

  describe('clearJobLocks', function () {
    // @TODO Do tests
  });

  describe('findAddon', function () {
    it('findAddon - existing addon', function (done) {
      const addons = [
        {name: 'mockAddon 1', data: 'balbo biggins'},
        {name: 'mockAddon 2', data: 'sum harris'},
        {name: 'mockAddon 3', data: 'pepe'}
      ];

      AddonManager.addons = addons;
      const addon = AddonManager.findAddon('mockAddon 2');
      expect(addon.data).to.equal('sum harris');
      done();
    });
  });

  describe('findAddonIndex', function () {
    it('findAddonIndex - existing addon', function (done) {
      const addons = [
        {name: 'mockAddon 1', data: 'balbo biggins'},
        {name: 'mockAddon 2', data: 'sum harris'},
        {name: 'mockAddon 3', data: 'pepe'}
      ];

      AddonManager.addons = addons;
      const firstIndex = AddonManager.findAddonIndex(addons[0]);
      expect(firstIndex).to.equal(0);

      const secondIndex = AddonManager.findAddonIndex(addons[2]);
      expect(secondIndex).to.equal(2);

      done();
    });
  });

  describe('registerAddon', function () {
    it('registerAddon - valid addon', function () {
      const addon = {
        name: 'mock addon',
        register: () => Promise.resolve('registered')};
      return expect(AddonManager.registerAddon(addon)).to.eventually.equal('registered');
    });
  });

  describe('unregisterAddon', function () {
    it('unregisterAddon - valid addon', function () {
      const addon = {unregister: () => Promise.resolve('unregistered')};
      return expect(AddonManager.unregisterAddon(addon)).to.eventually.equal('unregistered');
    });
  });

  describe('removeAddon', function () {
    it('removeAddon - existing addon', function () {
      const addons = [
        {name: 'jousting harris', safeToRemove: true},
        {name: 'nike mightley', safeToRemove: true}
      ];
      AddonManager.addons = addons;

      const addon = {
        name: 'jousting harris',
        safeToRemove: true
      };

      return AddonManager.removeAddon(addon).then(() => {
        expect(addons).to.have.lengthOf(1);
      });
    });
  });
});
