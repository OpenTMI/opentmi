const logger = require('winston');
/**
 * Error handling
 */

var Route = function(app){
  logger.log('-AddRoute: error');
  app.use(function (err, req, res, next) {
    // treat as 404
    if (err.message
      && (~err.message.indexOf('not found')
      || (~err.message.indexOf('Cast to ObjectId failed')))) {
      return next();
    }
    logger.error(err.stack);
    // error page
    res.status(500).json({
      url: req.originalUrl,
      error: err.stack
    });
  });

  // assume 404 since no middleware responded
  app.use(function (req, res, next) {
    res.status(404).json({
      url: req.originalUrl,
      error: 'Not found'
    });
  });
};

module.exports = Route;