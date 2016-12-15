/**
  Items Controller
*/

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');
var winston = require('winston');

//own modules
var DefaultController = require('./');

var Item = mongoose.model('Item');
var defaultCtrl;

var Controller = function(){
  defaultCtrl = new DefaultController(Item, 'Item');
  
  // Define route params
  this.paramFormat = defaultCtrl.format();
  this.paramItem = defaultCtrl.modelParam();

  // Define handlers for rest calls
  this.find = defaultCtrl.find;
  this.create = customCreate;
  
  this.get = defaultCtrl.get;
  this.update = customUpdate;
  this.remove = customRemove; // Default one does not run pre-remove hook

  return this;
}

function customCreate(req, res) {
  var item = new Item(req.body);
  item.save( function(err){
    if(err) {
	  winston.error(err.message); 
	  return res.status(400).json({ error:err.message }); 
	}
        
    if(res){
      return res.status(200).json(item);
    }
  });  
}

function customUpdate(req, res) {
  if (req.body.in_stock !== undefined && req.body.available === undefined) {
    handleUpdateInStock(req, res);
  }
  else if (req.body.in_stock === undefined && req.body.available !== undefined) {
	handleUpdateAvailable(req, res);
  }
  else if(req.body.in_stock !== undefined && req.body.available !== undefined) {  
	req.Item.available = req.body.available;
	req.Item.in_stock = req.body.in_stock;
  }
  
  // Regular save
  req.Item.save(function(err) {
	if (err) { 
	  winston.error(err.message);
	  return res.status(400).json({error:err.message}); 
	}
	else {
	  res.status(200).json(req.Loan); 
	}
  });
}

function handleUpdateInStock(req, res) {
  var delta_stock = req.body.in_stock - req.Item.in_stock;
  if (req.Item.available + delta_stock <= 0) {
	winston.error('cannot change in_stock in this manner, would result in negative availability');
	return res.status(400).json({error:'cannot change in_stock in this manner, would result in negative availability'});
  }
  else {
	req.Item.in_stock = req.body.in_stock;
	req.Item.available = req.Item.available + delta_stock;
  }    
}

function handleUpdateAvailable(req, res) {
  var delta_stock = req.body.available - req.Item.available;
  req.Item.available = req.body.available;
  req.Item.in_stock = req.Item.in_stock + delta_stock;
}

function customRemove(req, res) {
  req.Item.remove(function(err) {
	if (err) {
	  winston.error(err.message);
	  return res.status(400).json(err);
	}
	res.status(200).json({});
  });
}

module.exports = Controller;
