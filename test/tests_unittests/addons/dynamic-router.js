/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const logger = require('winston');

// Setup
logger.level = 'error';
chai.use(chaiAsPromised);

// Local components
const DynamicRouter = require('../../../app/addons/dynamic-router');

// Test variables
const {expect} = chai;
let dynamicRouter;

describe('dynamic-router.js', function () {
  beforeEach(function (done) {
    dynamicRouter = new DynamicRouter();
    done();
  });

  describe('router', function () {
    it('router - iterate over 5 routers', function (done) {
      // Prepare router template to create
      let routerCalled = 0;
      const router = (req, res, next) => {
        routerCalled += 1;
        next();
      };

      // Create testing routers
      for (let i = 0; i < 5; i += 1) {
        dynamicRouter.addonRouters.push({addon: {name: 'mockAddon'}, router});
      }

      dynamicRouter.router(undefined, undefined, () => {
        expect(routerCalled).to.equal(5);
        done();
      });
    });
  });

  describe('removeRouter', function () {
    it('removeRouter - existing router', function (done) {
      // Create testing routers
      for (let i = 0; i < 5; i += 1) {
        dynamicRouter.addonRouters.push({addon: {name: `mockAddon ${i}`}});
      }

      dynamicRouter.removeRouter({name: 'mockAddon 2'});

      expect(dynamicRouter.addonRouters.length).to.equal(4);

      const removedRouter = dynamicRouter.addonRouters.find(addonRouter => addonRouter.addon.name === 'mockAddon 2');
      expect(removedRouter).to.not.exist; // eslint-disable-line no-unused-expressions

      done();
    });
  });
});
