// 3rd party modules
const logger = require('winston');

class DynamicRouter {
  constructor() {
    this.addonRouters = [];
  }

  router(req, res, next) {
    if (this.addonRouters.length > 0) {
      this.recursiveRoute(0, req, res, next);
    } else {
      next();
    }
  }

  recursiveRoute(i, req, res, next) {
    logger.debug(`Addon: ${this.addonRouters[i].addon.name} is routing the request`);
    if (i >= this.addonRouters.length - 1) {
      // This is the last router, call the higher level next if nothing matches
      this.addonRouters[i].router(req, res, next);
    } else {
      // If there is more routers, call this router with the next router as next parameter
      this.addonRouters[i].router(req, res, () => this.recursiveRoute(i + 1, req, res, next));
    }
  }

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
