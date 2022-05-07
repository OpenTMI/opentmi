const logger = require('../tools/logger');

const AddonManager = require('../addons');

// *************************************************************
// * API FUNCTIONS                                             *
// *************************************************************
class AddonController {
  static addonParamHandler(req, res, next, name) {
    req.addon = AddonManager.findAddonIndex(name);
    next();
  }

  /**
   * List all currently known addons
   * @param {Object} req - request object from express
   * @param {Object} res - response object from express
   */
  static listAddons(req, res) {
    const addonList = AddonManager.addons.map((addon) => addon.toJson);
    res.status(200).json(addonList);
  }

  /**
   * Fetch new addon and define it on the server
   * @param {Object} req - request object from express
   * @param {Object} res - response object from express
   * @todo Implement fetching new addon from github
   */
  static routeAddAddon(req, res) {
    logger.warn('Addon fetching from github not yet implemented.');

    const addon = AddonManager.findAddon(req.body);
    if (addon) {
      res.status(400).json({name: req.body, error: 'addon already exists with this name.'});
    } else {
      // this.addonManager.addons.push(new Addon(req.body));
      res.status(501).send('Request was received but this feature is not yet implemented.');
    }
  }

  /**
   * Remove addon
   * @param {Object} req - request object from express
   * @param {Object} res - response object from express
   * @returns {Promise} promise to eventually send a result back to the requester
   */
  static routeRemoveAddon(req, res) {
    const existingIndex = AddonManager.findAddonIndex(req.addon);
    const removeResult = {name: req.addon.name};

    // Check that index was found exists
    if (existingIndex === -1) {
      res.status(404).json(removeResult);
      return Promise.resolve();
    }

    // Return a promise to eventually remove and respond to requester
    return AddonManager._removeAddon(existingIndex)
      .then(() => {
        removeResult.result = 'success';
        return removeResult;
      })
      .catch((error) => {
        removeResult.result = 'fail';
        removeResult.error = error.message;
        return removeResult;
      })
      .then((result) => res.status(200).json(result));
  }

  /**
   * Performs a specific action to all addons
   * @param {string} actionName - name of the action to perform on addon
   * @param {Object} req - request object from express
   * @param {Object} res - response object from express
   * @returns {Promise} promise to eventually send a list of operation results to requester
   */
  static routePerformAction(actionName, req, res) {
    if (!req.body || !(req.body instanceof Array)) {
      return res.status(400).json({error: 'Request body needs to be a json Array'});
    }

    const actionPromises = req.body.map((addonName) => {
      const currentAddon = AddonManager.findAddon(addonName);
      const actionResult = {result: 'fail', name: addonName};
      if (currentAddon) {
        return AddonManager[actionName](currentAddon)
          .then(() => {
            actionResult.needsRestart = (currentAddon.hasStaticContent) || false;
            actionResult.result = 'success';
          })
          .catch((error) => { actionResult.error = error.message; })
          .then(() => actionResult);
      }

      actionResult.error = 'No addon with such name.';
      return Promise.resolve(actionResult);
    });

    return Promise.all(actionPromises).then((results) => res.status(200).json(results));
  }
}

module.exports = AddonController;
