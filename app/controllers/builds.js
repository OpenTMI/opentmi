/**
  Builds Controller
*/

// native modules


// 3rd party modules
const mime = require('mime');

// own modules
const DefaultController = require('./');

class BuildsController extends DefaultController {
  constructor() { super('Build'); }

  static indexParam(req, res, next, Index) {
    if (!Number.isNaN(Index)) {
      req.Index = Number.parseInt(Index, 10);
      return next();
    }

    const error = new Error('Index must be an integer number');
    error.status = 400;
    return next(error);
  }

  static download(req, res, next) {
    // Retrieve file from wherever it is stored
    return req.Build.getFile(req.Index)
      .then((file) => {
        // Set correct headers
        const headers = {
          'Content-Type': mime.getType(file.name),
          'Content-disposition': `attachment;filename=${file.name}`,
          'Content-Length': file.data.length
        };

        if (file.encoding !== 'raw') {
          headers['Content-Encoding'] = file.encoding;
        }

        // Write header and send data
        res.writeHead(200, headers);
        res.end(file.data);
      })
      .catch((_error) => {
        const error = _error;
        error.status = _error.status || 500;
        error.message = `Could not download file: ${error.message}`;
        next(error);
      });
  }
}


module.exports = BuildsController;
