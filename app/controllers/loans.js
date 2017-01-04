/**
  Loans Controller 
*/

//3rd party modules
var winston = require('winston');
var express = require('express');
var mongoose = require('mongoose');

//own modules
var Loan = mongoose.model('Loan');
var DefaultController = require('./');

var Controller = function() {
  var defaultCtrl = new DefaultController(Loan, 'Loan');

  // Define route params
  this.paramFormat = defaultCtrl.format();
  this.paramLoan = defaultCtrl.modelParam();
  
  this.getMe = findUsersLoans;
  
  // Define handlers for rest calls
  this.find = defaultCtrl.find;
  this.create = customCreate;
  
  this.get = defaultCtrl.get;
  // We need information on previous state so update validation is partially handled by the controller
  this.update = customUpdate;
  // Default implementation des not fire up pre remove hooks, so override is necessary
  this.remove = customRemove;
  
  return this;
}

function findUsersLoans(req, res) {
  Loan.find({ loaner: req.user.sub })
    .populate('items.item')
    .exec(function(err, loans) {
      if (err) { 
		winston.error(err.message);
		res.sendStatus(500).json(err.message); 
	  } 
      else res.json(loans);
    });
}

function customCreate(req, res) {
  var loan = new Loan(req.body);
  loan.save(function(err) { 
    if (err) {
	  winston.error(err.message);
	  res.status(400).json({error:err.message});
	}
    else {
	  winston.info('Item save completed successfully');
	  res.status(200).json(loan);
    }
  });
}

function customUpdate(req, res) {
  if (req.body.items !== undefined) {
	winston.info('PUT request with items property received');
    err = handleItemsInUpdate(req, res);
    
    if (err) {
	  winston.error(err.message);
	  return res.status(400).json({ error:err.message });	
	}
  }
	
  // Update safe values
  for (key in req.body) {	
	req.Loan[key] = req.body[key]; 
  }
	
  // Save the result
  req.Loan.save(function(err) {
	if (err) { 
	  winston.error(err.message);
	  res.status(400).json({ error:err.message }); 		
	}
	else {
	  winston.info('Update completed successfully');
	  res.status(200).json(req.Loan);
	}
  });  
}
function handleItemsInUpdate(req, res) {
  var count_array = req.Loan.countReturns(req.body.items)
  if (count_array instanceof Error) {
    return count_array;
  }

  // Add return dates to model
  for (var i = 0; i < count_array.length; i++) {
    req.Loan.items[count_array[i].index].return_date = count_array[i].date;
  }
	  
  // Dereference items from body so they will not cause trouble later on
  delete req.body.items;
	  
  // Change availability
  req.Loan.modifyAvailability(count_array, function(err) {
    if (err) return err;
  });
}

function customRemove(req, res) {
  req.Loan.remove(function(err) {
	if (err) {
	  winston.error(err.message);
	  return res.status(400).json({ error:err.message });
	}
	res.status(200).json({});	
  });
}

module.exports = Controller;
