/**
  Items Controller
*/

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');

//own modules
var DefaultController = require('./');

var Item;
var defaultCtrl;

var Controller = function(){
  Item = mongoose.model('Item');
  defaultCtrl = new DefaultController(Item, 'Item');
  
  // Define route params
  this.paramFormat = defaultCtrl.format();
  this.paramItem = defaultCtrl.modelParam();

  // Define handlers for rest calls
  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = customCreate;
  this.update = customUpdate;
  this.remove = defaultCtrl.remove;

  return this;
}

function customCreate(req, res) {
  if ("in_stock" in req.body && "available" in req.body) {
	if (req.body.available > req.body.in_stock) {
	  res.status(400).json("Invalid field, available cannot be higher than in_stock");
	  return;
	}
  }
  
  defaultCtrl.create(req, res);
}

function customUpdate(req, res) {
  //console.log(JSON.stringify(req.body));
  if ("in_stock" in req.body && !("available" in req.body)) {
    updateInStock(req, res);
  }
  else if (!("in_stock" in req.body) && "available" in req.body) {
	updateAvailable(req, res);
  }
  else if ("in_stock" in req.body && "available" in req.body){
	updateBoth(req, res);
  }
  else {
	defaultCtrl.update(req, res);  
  }
}

function updateInStock(req, res) {
  if (req.body.in_stock < 0)  {
	res.status(400).json({error:"Cannot set in_stock to a negative number"});
	return;
  }
    
  Item.findOne({_id : req.params['Item']}, function(err, item) {
	if (err) { 
	  res.status(400).json({error:"Request failed item with param id"}); 
	  return;
    }

    if (!item) {
      res.status(404).json({error:"Cannot find item with param id"}); 
	  return; 
    }

	var delta_stock = req.body.in_stock - item.in_stock;
	if (item.available + delta_stock <= 0) {
	  res.status(400).json({error:"Cannot change in_stock in this manner, as it would result in negative availability"});
	  return;
	}
	else {
	  req.body.available = item.available + delta_stock;
	  defaultCtrl.update(req, res);
    }
  });    
}

function updateAvailable(req, res) {
  if (req.body.available < 0)  {
	res.status(400).json({error:"Cannot set available to a negative number"});
	return;
  }
    
  Item.findOne({_id : req.params['Item']}, function(err, item) {
	if (err) { 
	  res.status(400).json({error:"Request failed item with param id"}); 
	  return;
    }

    if (!item) {
      res.status(404).json({error:"Cannot find item with param id"}); 
	  return; 
    }

	var delta_stock = req.body.available - item.available;
	req.body.in_stock = item.in_stock + delta_stock;
	defaultCtrl.update(req, res);
  });
}

function updateBoth(req, res) {
  if (req.body.availability < 0 || req.body.in_stock < 0) {
	res.status(400).json({error:"Cannot set available or in_stock to a negative number"});
	return;
  }
  
  if (req.body.availability > req.body.in_stock) {
	res.status(400).json({error:"Cannot set availability bigger than in_stock"});
	return;
  }
  
  defaultCtrl.update(req, res);
}

module.exports = Controller;
