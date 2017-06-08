/**
  Loans Controller 
*/

// 3rd party modules
const winston = require('winston');
const mongoose = require('mongoose');

// own modules
const DefaultController = require('./');

class Controller extends DefaultController {
  constructor() {
    super(mongoose.model('Loan'), 'Loan');

    // Define route params
    this.paramFormat = DefaultController.format();
    this.paramLoan = this.modelParam();
  }

  create(req, res) {
    const loan = new this.Model(req.body);
    loan.save((err) => {
      if (err) {
        winston.error(err.message);
        res.status(400).json({ error: err.message });
      } else {
        winston.info('Item save completed successfully');
        res.status(200).json(loan);
      }
    });
  }

  update(req, res) {
    if (req.body.items !== undefined) {
      winston.info('PUT request with items property received');
      const err = Controller._handleItemsInUpdate(req);

      if (err) {
        winston.error(err.message);
        return res.status(400).json({ error: err.message });
      }
    }

    // Update safe values
    for (const key in req.body) {
      req.Loan[key] = req.body[key];
    }

    // Save the result
    req.Loan.save((err) => {
      if (err) {
        winston.error(err.message);
        res.status(400).json({ error: err.message });
      } else {
        winston.info('Update completed successfully');
        res.status(200).json(req.Loan);
      }
    });

    return undefined;
  }

  static _handleItemsInUpdate(req) {
    const countArray = req.Loan.countReturns(req.body.items);
    if (countArray instanceof Error) {
      return countArray;
    }

    // Add return dates to model
    for (let i = 0; i < countArray.length; i += 1) {
      req.Loan.items[countArray[i].index].return_date = countArray[i].date;
    }

    // Dereference items from body so they will not cause trouble later on
    delete req.body.items;

    // Change availability
    req.Loan.modifyAvailability(countArray, (err) => {
      if (err) return err;
      return undefined;
    });

    return undefined;
  }

  // Default implementation does not fire up pre-remove hooks, so override is necessary
  remove(req, res) {
    req.Loan.remove((err) => {
      if (err) {
        winston.error(err.message);
        return res.status(400).json({ error: err.message });
      }

      return res.status(200).json({});
    });
  }

  findUsersLoans(req, res) {
    Loan.find({ loaner: req.user.sub })
      .populate('items.item')
      .exec((err, loans) => {
        if (err) {
          winston.error(err.message);
          return res.sendStatus(500).json(err.message);
        }

        return res.json(loans);
      });
  }
}


module.exports = Controller;
