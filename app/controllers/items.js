/**
  Items Controller
*/

// 3rd party modules
const logger = require('winston');

// own modules
const DefaultController = require('./');

class ItemsController extends DefaultController {
  constructor() { super('Item'); }

  update(req, res) { // eslint-disable-line 
    // Handle requests that only provide available or in_stock in a special manner
    if (req.body.in_stock !== undefined && req.body.available === undefined) {
      ItemsController._handleUpdateInStock(req);
    } else if (req.body.in_stock === undefined && req.body.available !== undefined) {
      ItemsController._handleUpdateAvailable(req);
    }

    // Updating the item body
    Object.keys(req.body).forEach((key) => {
      req.Item[key] = req.body[key];
    });

    // Regular save
    req.Item.save((err) => {
      if (err) {
        logger.warn(err.message);
        return res.status(400).json({error: err.message});
      }

      return res.status(200).json(req.Item);
    });
  }

  static _handleUpdateInStock(req) {
    const deltaStock = req.body.in_stock - req.Item.in_stock;

    // Increase availability with the same amount that in_stock was changed
    logger.info(`Received only in_stock in PUT, automatically modifying available with the same amount: ${deltaStock}`);
    req.body.available = req.Item.available + deltaStock;
  }

  static _handleUpdateAvailable(req) {
    const deltaStock = req.body.available - req.Item.available;

    // Update in_stock in accordance with received delta in_stock
    logger.info(`Received only available in PUT, automatically modifying in_stock with the same amount: ${deltaStock}`);
    req.body.in_stock = req.Item.in_stock + deltaStock;
  }

  static getImage(req, res) {
    req.Item.fetchImageData((result) => {
      if (result instanceof Error) {
        return res.status(400).json({error: result.message});
      }

      // console.log('Image found, returning data : ' + JSON.stringify(result));
      res.set('Content-Type', result.type);
      return res.send(result.data);
    });
  }
}


module.exports = ItemsController;
