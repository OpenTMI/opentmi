const logger = require('../tools/logger');

/**
 * Error handling
 */
function Route(app) {
  logger.debug('Adding error route.');
  app.use((error, req, res, next) => {
    // treat as 404
    const msg = error.message;
    if (msg && (msg.indexOf('not found') >= 0 || msg.indexOf('Cast to ObjectId failed') >= 0)) {
      return next();
    }

    logger.error(error.stack);

    // error page
    const status = error.status || 500;
    res.status(status).json({
      url: req.originalUrl,
      error: error.stack
    });

    return undefined;
  });

  // assume 404 since no middleware responded
  app.use((req, res) => {
    // TEMPORARY hack so this branch does not break functionality
    // will be removed very soon due to new addon manager merge
    const path = require('path'); // eslint-disable-line
    if (req.originalUrl.match(/^\/inventory/)) {
      res.status(200).sendFile(path.resolve(__dirname, '../addons/inventory-service/dist/index.html'));
    }

    res.status(404).json({
      url: req.originalUrl,
      error: 'Not found'
    });
  });
}

module.exports = Route;
