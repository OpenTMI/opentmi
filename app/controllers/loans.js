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
  this.get = customGet;
  this.find = defaultCtrl.find;
  this.create = validateAndCreate;
  
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

// Iterators
function makeArrayIterator(array) {
  var next_index = 0;
  
  return {
    next: function() {
	  return next_index < array.length ?
	    {value: array[next_index++], done: false} :
	    {done: true};
	}
  }
}
function makeDictIterator(dictionary) {
  var keys = Object.keys(dictionary);
  var next_index = 0;
  
  return {
	next: function() {
	  if (next_index < keys.length) {
	    var key = keys[next_index];
	    var value = dictionary[key];
	    next_index += 1;
          return {key:key, value:value, done: false};
      } 
      else {
		return {done: true};
	  }
	}
  }
}
 
// Shared item validation function
function validateItems(item_iterator, relevant_items, callback) {
  // Fetch the current value
  var next = item_iterator.next();
  
  // If the iterator is done, callback
  if (next.done) {
	callback(undefined, relevant_items); 
	return;
  }
  
  // Check that item field is defined
  if (!("item" in next.value)) {
	callback({code:400, message:"Missing field, provided item does not define an 'item' field"}, undefined); 
	return;
  }
  
  // If the item in question is defined just increase its' count
  if (next.value.item in relevant_items) {
	relevant_items[next.value.item].count += 1;  
	validateItems(item_iterator, relevant_items, callback);
	return;
  }
  
  // Find how many items with the _id exist
  Item.find({_id:next.value.item}, function(err, docs) {
    if (err) {
      callback({code:400, message:'Something weird, cannot find id:  ' + next.value.item + ' is invalid'}, undefined);
    }
    else if (docs.length === 0) {
	  callback({code:400, message:'Bad reference, ' + next.value.item + ' does not refer to any item'}, undefined);
	}
	else if (docs.length === 1) {
	  // Define item for dictionary
	  relevant_items[next.value.item] = {item:docs[0], count:1};  
      validateItems(item_iterator, relevant_items, callback);
	}
	else {
	  callback({code:500, message:'Messy database, ' + next.value.item + ' refers to more than one item'}, undefined);
	}
  });
}

//#####################
//# Create Validation #
//#####################
function validateAndCreate(req, res) {
  if (!(req.body.items instanceof Array)) { // Items field is an array
	res.status(400).json({error:'Invalid field, items field either missing or not an array'});
	return;
  }
	
  // Field items should not be empty
  if (req.body.items.length === 0) {
	res.status(400).json({error:'Invalid field, items field contained an empty array.'});
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
	validateItems(makeArrayIterator(req.body.items), dict, function(err, relevant_items) {
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
      loan.validate(function(err) {
		if (err) { 
		  res.status(err.code).json({error:err.message}); 
		  return;
		}  

		// Enforce availability changes
        subtractItemAvailability(makeDictIterator(relevant_items), function(err) {
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
function subtractItemAvailability(dict_iterator, callback) {
  var next = dict_iterator.next();
  if (next.done) {
    callback(undefined);
    return;
  }
  
  Item.findOneAndUpdate({_id:next.key}, {available: next.value.item.available - next.value.count}, function(err, item) {
    if (err) { callback({code:500, message:'Could not update item ' + item + ', something went wrong with update.'}); }
    else     { subtractItemAvailability(dict_iterator, callback); } 
  });
}


//#####################
//# Update Validation #
//#####################
// TODO
// should not allow PUT to change an already loaned item to another, should go through a new loan
function validateAndUpdate(req, res) {
  // Request does not modify items array, no further custom validation needed
  if (!("items" in req.body)) {
	defaultCtrl.update(req, res);
	return;
  }
  
  // Field items does not contain an array
  if (!req.body.items instanceof Array) { // Did not receive an array
	res.status(400).json({error:"Invalid field, items field did not contain an array."});
    return;
  }
 
  // Validate provided items
  validateItems(makeArrayIterator(req.body.items), {}, function(err, relevant_items) {
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
		
	  // Make initial changes to loan
	  for (key in req.body) {
	    loan[key] = req.body[key];
	  }
	  
	  // Validate the new fields
	  loan.validate(function(err) {
		if (err) {
		  res.status(400).json({error:err});
		  return;
		} 
		
		// Should not fail after validation anymore
		addItemAvailability(makeDictIterator(relevant_items), function(err) {
		  if (err) {
			res.status(400).json({error:err});
            return;
		  }
		    
		  // Save changes
		  loan.save(function(err) {
	        if (err) {
		      res.status(400).json({error:err});
		      return;
		    }
		      
		    defaultCtrl.emit('update', loan.toObject());  	  
		    res.json(loan);
	      });
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
function addItemAvailability(dict_iterator, callback) {
  var next = dict_iterator.next();
  if (next.done) {
    callback(undefined);
    return;
  }
  
  Item.findOneAndUpdate({_id:next.key}, {available: next.value.item.available + next.value.returns}, function(err, item) {
    if (err) { callback({code:500, message:'Could not update item ' + item + ', something went wrong with update.'}); }
    else     { subtractItemAvailability(dict_iterator, callback); } 
  });
}


//#####################
//# Get Validation    #
//#####################
function customGet(req, res) {
  Loan.find({_id: req.params['Loan']}, function(err, docs) {
	if (err) { res.status(400).json({error:'Something went wrong with the request, probably an invalid _id'}); }
	else if (docs.length === 0) { res.status(404).json({error:'Document not found'});}
	else if (docs.length === 1) { res.json(docs[0]); }
	else { res.status(400).json({error:'More than one document found, something wrong with the database'}) }
  });
}


module.exports = Controller;
