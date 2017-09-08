const logger = require('../tools/logger');

/**
 * Error handling
 */
function Route(app) {
  logger.debug('Adding error route.');
  app.use((error, req, res, next) => {
    const msg = error.message;

    // Error was expected and most likely the clients fault
    if (error.statusCode) {
      return res.status(error.statusCode).json({error: msg});
    }

    // If error message looks like 404, treat like 404
    if (msg && (msg.indexOf('not found') >= 0 || msg.indexOf('Cast to ObjectId failed') >= 0)) {
      return next();
    }

    // Unexpected error that should be reported and fixed
    logger.error(error.stack);
    return res.status(500).json({
      url: req.originalUrl,
      error: error.stack
    });
  });

  // assume 404 since no middleware responded
  app.use((req, res) => {
    res.status(404).json({
      url: req.originalUrl,
      error: 'Not found'
    });
  });
}

module.exports = Route;
