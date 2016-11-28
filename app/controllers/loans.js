/**
  Loans Controller 
*/

//3rd party modules
var winston = require('winston');
var express = require('express');
var mongoose = require('mongoose');

//own modules
var DefaultController = require('./');

var Item = undefined;
var Loan = undefined;
var defaultCtrl = undefined;

var Controller = function(){
  Item = mongoose.model('Item');
  Loan = mongoose.model('Loan');
  defaultCtrl = new DefaultController(Loan, 'Loan');

  // Define route params
  this.paramFormat = defaultCtrl.format();
  this.paramLoan = defaultCtrl.modelParam();
  
  // Define handlers for rest calls
  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = validateAndCreate;
  
  //this.update = defaultCtrl.update;
  this.update = validateAndUpdate;
  
  this.remove = defaultCtrl.remove;

  this.me = function(req, res) {
    Loan.find({loaner: req.user})
    .populate('items.item')
    .exec(function(err, loans) {
      res.json(loans);
    });
  }

  return this;
}

function subtractItemAvailability(i, keys, items, callback) {
  Item.findOneAndUpdate({_id:keys[i]}, {available: items[keys[i]].item.available - items[keys[i]].count}, function(err, item) {
    if (err) { callback({code:500, message:'Could not update item ' + item + ', something went wrong with update.'}); }
    else {
	  if (i + 1 >= keys.length) { 
	    callback(undefined); 
      }
      else {
		subtractItemAvailability(i + 1, keys, items, callback);
	  }
	}
  });
}
function addItemAvailability(i, keys, items, callback) {
	Item.findOneAndUpdate({_id:keys[i]}, {available: items[keys[i]].item.available + items[keys[i]].returns}, function(err, item) {
    if (err) { callback({code:500, message:'Could not update item ' + item + ', something went wrong with update.\n' + err}); }
    else {
	  if (i + 1 >= keys.length) { 
	    callback(undefined); 
      }
      else {
		AddItemAvailability(i + 1, keys, items, callback);
	  }
	}
  });
}
 
function validateItems(i, items, relevant_items, callback) {
  // If item has already been fetched, increase count and either callback or call self again with next index
  if (relevant_items[items[i].item]) {
	// Increase count of an item
	relevant_items[items[i].item].count += 1;
	
    if (i + 1 >= items.length) { callback(undefined, relevant_items); } // This is where we want to be
    else                       { validateItems(i + 1, items, relevant_items, callback); }
    return; //Return so that on the way back we won't call Item.find a second time
  }
  
  // Find how many items with the _id exist
  Item.find({_id:items[i].item}, function(err, docs) {
    if (err) {
      callback({code:400, message:'Something weird, cannot find id:  ' + items[i].item + ' is invalid'}, undefined);
    }
    else if (docs.length === 0) {
	  callback({code:400, message:'Bad reference, ' + items[i].item + ' does not refer to any item'}, undefined);
	}
	else if (docs.length === 1) {
	  // Define item for dictionary
	  relevant_items[items[i].item] = {item:docs[0], count:1};  

	  // Callback if at the last index, otherwise call self with increased index
	  if (i + 1 >= items.length) { callback(undefined, relevant_items); } // This is where we want to be 
      else { validateItems(i + 1, items, relevant_items, callback); } 
	}
	else {
	  callback({code:500, message:'Messy database, ' + items[i].item + ' refers to more than one item'}, undefined);
	}
  });
}

//#####################
//# Create Validation #
//#####################
// TODO:
// Prefilled return date with request breaks everything, need to check for that
function validateAndCreate(req, res) {
  if (!(req.body.items instanceof Array)) { // Items field is an array
	res.status(400).json({error:'Invalid field, items field either missing or not an array'});
	return;
  }
	
  // Ensure return date is not already defined
  for (i in req.body.items) {
	if (req.body.items[i].return_date) {
      res.status(400).json({error:'Invalid field, return_date predefining is not allowed'});
      return;
    }
  }
   
  // Test that loaner is present and valid
  if (!req.body.loaner) {
	res.status(400).json({error:'Missing field, loaner field could not be found in the request body'});
	return;
  }
   
  validateLoaner(req.body.loaner, function(err, user) {
	if (err) { 
	  res.status(err.code).json({error:err.message}); 
	  return;
	}	
	
	// Items are valid
	dict = {};
	validateItems(0, req.body.items, dict, function(err, relevant_items) {
      if (err) { 
		res.status(err.code).json({error:err.message});
		return;
	  }

	  // Ensure availability  
      for (i in relevant_items) {
	    if (relevant_items[i].item.available < relevant_items[i].count) {
		  res.status(400).json({error:'Not enough items in: ' + i +  ', currently available ' + relevant_items[i].item.available});
	      return;
	    }
	  }
	  
      var loan = new Loan(req.body);
      loan.validate(function() {
		// Enforce availability changes
        subtractItemAvailability(0, Object.keys(relevant_items), relevant_items, function(err) {
		  if (err) { res.status(err.code).json({error:err.message}); }
		  else     { createLoan(req, res, loan); }
		});
      }); 
    });
  });
}

function validateLoaner(user_id, callback) {
  var User = mongoose.model('User');
  //console.log('User: ' + user_id);
  
  // Find how many users with the _id exist
  User.find({_id:user_id}).exec(function(err, result_users) {
    if (err) {
	  callback({code:400, message:'Something weird went wrong in user validification, perhaps your ObjectId was invalid'}, undefined); 
	}
    else if (result_users.length === 0) { 
	  callback({code:400, message:'Bad reference, ' + user_id + ' does not refer to any user'}, undefined);	
	}
    else if (result_users.length === 1) { 
	  callback(undefined, result_users[0]); 
	}
    else {
	  callback({code:500, error:'Messy database, ' + user_id + ' refers to more than one user'}, undefined); 
	}
  });
}

function createLoan(req, res, loan){
  loan.save(function(error) {
    if(error) {
	  // One validation is done before this, we should never get here
      winston.warn(error);
      if(res) { res.status(300).json({error: error}); }
    } 
    else {
      if(res) {
        req.query = req.body;
        defaultCtrl.emit('create', loan.toObject());
        res.json(loan);
      }
    }
  });
}

//#####################
//# Update Validation #
//#####################
// TODO
// should not allow PUT to change an already loaned item to another, sholud go through a new loan
function validateAndUpdate(req, res) {
  // Request does not modify items array, no further custom validation needed
  if (!req.body.items) {
	defaultCtrl.update(req, res);
	return;
  }
 
  // Field items does not contain an array
  if (!req.body.items instanceof Array) { // Did not receive an array
	res.status(400).json({error:'Invalid field, items field did not contain an array.'});
    return;
  }
  
  // Validate provided items
  validateItems(0, req.body.items, {}, function(err, relevant_items) {
    if (err) {
	  res.status(err.code).json({error: err.message});
	  return;
    }

	// Counts returned items and verifies this loan actually exists
    verifyItemsInLoan(req.params['Loan'], req.body.items, relevant_items, function(err, loan, relevant_items) {
	  if (err) { 
	    res.status(err.code).json({error:err.message}); 
		return;  
	  }
		
	  // Perform update and run model validators
	  Loan.findOneAndUpdate({_id:loan._id}, req.body, {runValidators: true}, function(err, loan) { 
		if (err) {
		  res.status(400).json({error:err});
		  return;
		}
		
		defaultCtrl.emit('update', loan.toObject());
		res.json(loan);
		
		//console.log(JSON.stringify(relevant_items));
		
		// Modify item availability, by all logic this should not throw an error
		addItemAvailability(0, Object.keys(relevant_items), relevant_items, function(err) {
		  if (err) {
			console.log(err.message);
            //res.status(err.code).json({error:err.message});	
		  }
	    });	  
	  });
	});
  });
}

function verifyItemsInLoan(loan_id, items, validated_items, callback) {
  Loan.findById(loan_id, function(err, loan) {
	if (err) {
	  callback({code:400, message:'Invalid id, loan with the id: ' + loan_id + ' was not found'}, undefined, undefined);
	  return;
	}

    if (!loan) {
      callback({code:404, message:'Invalid id, loaner with the id does not exist'})
      return;
    }      

	for (i in items) {
	  // Define a parent key for this item if one doesn't exist
	  if (!validated_items[items[i].item]) { validated_items[items[i].item] = {}; }
      // Define returns key for this item if one doesn't exist
      if (!validated_items[items[i].item].returns) { validated_items[items[i].item].returns = 0; }
      
	  // Check whether a subdocument of this item exists or not
	  var sub_document = loan.items.id(items[i]._id);	
	  if (sub_document) {
		if (items[i].return_date && !sub_document.return_date) {
		  validated_items[items[i].item].returns += 1;
	    }
	  }
	  else {
		callback({code:400, message:'Invalid field, ' + items[i]._id + ' is not a valid subdocument id'});
		return;
	  }
	}
	  
	callback(undefined, loan, validated_items);  
  });
}

module.exports = Controller;
