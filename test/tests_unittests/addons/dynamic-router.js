/* global describe beforeEach it */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const logger = require('winston');

logger.level = 'error';

const expect = chai.expect;
chai.use(chaiAsPromised);

const DynamicRouter = require('../../../app/addons/dynamic-router');

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
        dynamicRouter.addonRouters.push({ addon: { name: 'mockAddon' }, router });
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
        dynamicRouter.addonRouters.push({ addon: { name: `mockAddon ${i}` } });
      }

      dynamicRouter.removeRouter({ name: 'mockAddon 2' });

      expect(dynamicRouter.addonRouters.length).to.equal(4);

      const removedRouter = dynamicRouter.addonRouters.find(pAddonRouter => pAddonRouter.addon.name === 'mockAddon 2');
      expect(removedRouter).to.not.exist; // eslint-disable-line no-unused-expressions

      done();
    });
  });
});
