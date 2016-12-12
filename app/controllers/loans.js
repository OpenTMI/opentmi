/**
  Loans Controller 
*/

//3rd party modules
var winston = require('winston');
var express = require('express');
var mongoose = require('mongoose');

//own modules
var DefaultController = require('./');

var Controller = function(){
  var Loan = mongoose.model('Loan');
  var defaultCtrl = new DefaultController(Loan, 'Loan');

  // Define route params
  this.paramFormat = defaultCtrl.format();
  this.paramLoan = defaultCtrl.modelParam();
  
  // Define handlers for rest calls
  this.find = defaultCtrl.find;
  this.get = defaultCtrl.get;
  
  this.getMe = function(req, res) {
    Loan.find({loaner: req.user.sub})
    .populate('items.item')
    .exec(function(err, loans) {
      if (err) { res.sendStatus(500); } else {
        res.json(loans);
      }
    });
  };

  this.create = function(req, res) {
	//console.log('Create getto');
	var loan = new Loan(req.body);
	loan.save(function(err) { 
	  //console.log('Save done');
      if (err) res.status(400).json({error:err.message});
      else res.status(200).json(loan);
    });
  } 
  
  // We need information on previous state so update validation is partially handled by the controller
  this.update = function(req, res) {   
	if (typeof req.body.items !== 'undefined') {
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
  
  this.remove = defaultCtrl.remove;
  
  return this;
}

module.exports = Controller;
