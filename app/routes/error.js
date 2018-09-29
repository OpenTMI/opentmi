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
      method: req.method,
      url: req.originalUrl,
      error: error.stack
    });

    return undefined;
  });

  // assume 404 since no middleware responded
  app.use((req, res) => {
    res.status(404).json({
      method: req.method,
      url: req.originalUrl,
      error: 'Not found'
    });
  });
}

module.exports = Route;
