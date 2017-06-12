/**
  Loans Controller
*/

// 3rd party modules
const winston = require('winston');

// own modules
const DefaultController = require('./');

class LoansController extends DefaultController {
  constructor() { super('Loan'); }

  create(req, res) {
    const loan = new this.Model(req.body);
    loan.save((err) => {
      if (err) {
        winston.warn(err.message);
        res.status(400).json({ error: err.message });
      } else {
        winston.info('Loan save completed successfully');
        req.query = req.body;
        this.emit('create', loan.toObject());
        res.status(200).json(loan);
      }
    });
  }

  update(req, res) {
    if (req.body.items !== undefined) {
      winston.info('PUT request with items property received');
      const err = LoansController._handleItemsInUpdate(req);

      if (err) {
        winston.warn(err.message);
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
        winston.warn(err.message);
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

  findUsersLoans(req, res) {
    this.Model.find({ loaner: req.user.sub })
      .populate('items.item')
      .exec((err, loans) => {
        if (err) {
          winston.warn(err.message);
          return res.sendStatus(500).json(err.message);
        }

        return res.json(loans);
      });
  }
}


module.exports = LoansController;
