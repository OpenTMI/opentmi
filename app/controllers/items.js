/**
  Items Controller
*/

// 3rd party modules
const mongoose = require('mongoose');
const winston = require('winston');

// own modules
const DefaultController = require('./');

class Controller extends DefaultController {
  constructor() {
    super(mongoose.model('Item'), 'Item');

    // Define route params
    this.paramFormat = DefaultController.format();
    this.paramItem = this.modelParam();
  }

  create(req, res) {
    const item = new this.Model(req.body);
    item.save((err) => {
      if (err) {
        winston.error(err.message);
        return res.status(400).json({ error: err.message });
      }

      if (res) {
        return res.status(200).json(item);
      }

      return undefined;
    });
  }

  update(req, res) {
    // Handle requests that only provide available or in_stock in a special manner
    if (req.body.in_stock !== undefined && req.body.available === undefined) {
      Controller._handleUpdateInStock(req);
    } else if (req.body.in_stock === undefined && req.body.available !== undefined) {
      Controller._handleUpdateAvailable(req);
    }

    // Updating the item body
    for (const key in req.body) {
      req.Item[key] = req.body[key];
    }

    // Regular save
    req.Item.save((err) => {
      if (err) {
        winston.error(err.message);
        return res.status(400).json({ error: err.message });
      }

      return res.status(200).json(req.Loan);
    });
  }

  static _handleUpdateInStock(req) {
    const deltaStock = req.body.in_stock - req.Item.in_stock;

    // Increase availability with the same amount that in_stock was changed
    winston.info(`Received only in_stock in PUT, automatically modifying available with the same amount: ${deltaStock}`);
    req.body.available = req.Item.available + deltaStock;
  }

  static _handleUpdateAvailable(req) {
    const deltaStock = req.body.available - req.Item.available;

    // Update in_stock in accordance with received delta in_stock
    winston.info(`Received only available in PUT, automatically modifying in_stock with the same amount: ${deltaStock}`);
    req.body.in_stock = req.Item.in_stock + deltaStock;
  }

  remove(req, res) {
    req.Item.remove((err) => {
      if (err) {
        winston.error(err.message);
        return res.status(400).json(err);
      }

      return res.status(200).json({});
    });
  }

  static getImage(req, res) {
    req.Item.fetchImageData((result) => {
      if (result instanceof Error) {
        return res.status(400).json(result.message);
      }

      // console.log('Image found, returning data : ' + JSON.stringify(result));
      res.set('Content-Type', result.type);
      return res.send(result.data);
    });
  }
}


module.exports = Controller;
