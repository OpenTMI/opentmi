// 3rd party modules
const async = require('async');
// application modules
const logger = require('../tools/logger');
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
  router(req, res, next) {
    const resolveRoute = (router, reqParam, resParam, nextParam) => { router(reqParam, resParam, nextParam); };
    const routers = this.addonRouters.map((addonRouter) => resolveRoute.bind(this, addonRouter.router, req, res));
    async.waterfall(routers, next);
  }

  /**
   * Remove router that is linked to the provided addon
   */
  removeRouter(addon) {
    for (let i = 0; i < this.addonRouters.length; i += 1) {
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
