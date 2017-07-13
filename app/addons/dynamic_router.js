// 3rd party modules
const logger = require('winston');
const async = require('async');

/**
 * Collection of routers that act like a single router to allow addons to
 * dynamically define and undefine routes
 */
class DynamicRouter {
  constructor() {
    this.addonRouters = [];
  }

  /**
   * Route entrypoint that is fed to express app
   */
  router(pReq, pRes, pNext) {
    const resolveRoute = (router, req, res, next) => { router(req, res, next); };
    const routers = this.addonRouters.map(pAddonRouter => resolveRoute.bind(this, pAddonRouter.router, pReq, pRes));
    async.waterfall(routers, pNext);
  }

  /**
   * Remove router that is linked to the provided addon
   */
  removeRouter(addon) {
    for (let i = 0; i < this.addonRouters.length; i++) {
      if (this.addonRouters[i].addon.name === addon.name) {
        this.addonRouters.splice(i, 1);

        logger.debug(`Removed router for addon: ${addon.name}.`);
        return;
      }
    }

    logger.warn(`Could not find and remove router for addon: ${addon.name}.`);
  }
}


module.exports = DynamicRouter;
