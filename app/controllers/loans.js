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
  Loan.find({loaner: req.user})
    .populate('items.item')
    .exec(function(err, loans) {
      res.json(loans);
    });
}

function customCreate(req, res) {
  //console.log('Create getto');
  var loan = new Loan(req.body);
  loan.save(function(err) { 
    //console.log('Save done');
    if (err) res.status(400).json({error:err.message});
    else res.status(200).json(loan);
  });
}

function customUpdate(req, res) {
  if (req.body.items !== undefined) {
	//console.log('Updating');
	var count_objs = req.Loan.countReturns(req.body.items)
	if (count_objs instanceof Error) return res.status(400).json({error:count_objs.message});
	  
	// Add return dates to model
	for (var i = 0; i < count_objs.length; i++) {
	  req.Loan.items[count_objs[i].index].return_date = count_objs[i].date;
	  //req.Loan.markModified('items.' + count_objs[i].index); 
	}
	  
	// Dereference items from body so they will not cause trouble later on
	delete req.body.items;
	  
	// Change availability
	req.Loan.modifyAvailability(count_objs, function(err) {
	  if (err) return res.status(400).json({error:'could not return items, something went horribly wrong'});
	});
  } 
	
  // Update safe values
  for (key in req.body) {	
	req.Loan[key] = req.body[key]; 
  }
	
  // Save the result
  req.Loan.save(function(err) {
	if (err) { res.status(400).json({error:err}); }
	else { res.status(200).json(req.Loan); }	
  });  
}

function customRemove(req, res) {
  req.Loan.remove(function(err) {
	if (err) return res.status(400).json({ error:err });
	res.status(200).json({});	
  });
}

module.exports = Controller;
