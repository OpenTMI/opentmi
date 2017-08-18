/**
  Loans Controller
*/

// 3rd party modules
const logger = require('../tools/logger');

// own modules
const DefaultController = require('./');

class LoansController extends DefaultController {
  constructor() { super('Loan'); }

  update(req, res) {
    if (req.body.items !== undefined) {
      logger.info('PUT request with items property received');
      LoansController._handleItemsInUpdate(req, (handlingError) => {
        if (handlingError) {
          logger.warn(handlingError.message);
          return res.status(400).json({error: handlingError.message});
        }

        // Update safe values
        Object.keys(req.body).forEach((key) => {
          req.Loan[key] = req.body[key];
        });

        // Save the result
        req.Loan.save((saveError) => {
          if (saveError) {
            logger.warn(saveError.message);
            return res.status(400).json({error: saveError.message});
          }

          logger.info('Update completed successfully');
          return res.status(200).json(req.Loan);
        });

        return undefined;
      });
    } else {
      // Default update works if items are not involved
      super.update(req, res);
    }
  }

  static _handleItemsInUpdate(req, next) {
    const countArray = req.Loan.countReturns(req.body.items);
    if (countArray instanceof Error) {
      return next(countArray);
    }

    // Add return dates to model
    for (let i = 0; i < req.body.items.length; i += 1) {
      for (let j = 0; j < req.Loan.items.length; j += 1) {
        if (req.body.items[i]._id.toString() === req.Loan.items[j]._id.toString()) {
          req.Loan.items[j].return_date = req.body.items[i].return_date;
          break;
        }
      }
    }

    // Dereference items from body so they will not cause trouble later on
    delete req.body.items;

    // Change availability
    req.Loan.modifyAvailability(countArray, err => next(err));
    return undefined;
  }

  findUsersLoans(req, res) {
    this.Model.find({loaner: req.user.sub})
      .populate('items.item')
      .exec((err, loans) => {
        if (err) {
          logger.warn(err.message);
          return res.status(500).json({error: err.message});
        }

        return res.json(loans);
      });
  }
}


module.exports = LoansController;
