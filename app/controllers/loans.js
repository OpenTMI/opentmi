/**
  Loans Controller 
*/

// 3rd party modules
var winston = require('winston');
var mongoose = require('mongoose');

// own modules
var Loan = mongoose.model('Loan');
var DefaultController = require('./');

function findUsersLoans(req, res) {
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

function customCreate(req, res) {
  var loan = new Loan(req.body);
  loan.save((err) => {
    if (err) {
      winston.error(err.message);
      res.status(400).json({ error: err.message });
    }
    else {
      winston.info('Item save completed successfully');
      res.status(200).json(loan);
    }
  });
}

function handleItemsInUpdate(req, res) {
  var countArray = req.Loan.countReturns(req.body.items);
  if (countArray instanceof Error) {
    return countArray;
  }

  // Add return dates to model
  for (var i = 0; i < countArray.length; i += 1) {
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

function customUpdate(req, res) {
  if (req.body.items !== undefined) {
    winston.info('PUT request with items property received');
    var err = handleItemsInUpdate(req, res);

    if (err) {
      winston.error(err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // Update safe values
  for (key in req.body) {
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

function customRemove(req, res) {
  req.Loan.remove((err) => {
    if (err) {
      winston.error(err.message);
      return res.status(400).json({ error: err.message });
    }

    return res.status(200).json({});
  });
}

var Controller = function () {
  var defaultCtrl = new DefaultController(Loan, 'Loan');

  // Define route params
  this.paramFormat = DefaultController.format();
  this.paramLoan = defaultCtrl.modelParam();

  this.getMe = findUsersLoans;

  // Define handlers for rest calls
  this.find = defaultCtrl.find;
  this.create = customCreate;

  this.get = defaultCtrl.get;
  // We need information on previous state so update validation partially handled by the controller
  this.update = customUpdate;
  // Default implementation des not fire up pre remove hooks, so override is necessary
  this.remove = customRemove;

  return this;
};

module.exports = Controller;
