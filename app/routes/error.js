const logger = require('winston');

/**
 * Error handling
 */
function Route(pApp) {
  logger.log('-AddRoute: error');
  pApp.use((pError, pReq, pRes, pNext) => {
    // treat as 404
    const msg = pError.message;
    if (msg && (msg.indexOf('not found') >= 0 || msg.indexOf('Cast to ObjectId failed') >= 0)) {
      return pNext();
    }

    logger.error(pError.stack);

    // error page
    pRes.status(500).json({
      url: pReq.originalUrl,
      error: pError.stack
    });

    return undefined;
  });

  // assume 404 since no middleware responded
  pApp.use((pReq, pRes) => {
    pRes.status(404).json({
      url: pReq.originalUrl,
      error: 'Not found'
    });
  });
}

module.exports = Route;
