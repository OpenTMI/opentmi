/**
  Items Controller
*/

//3rd party modules
var express = require('express');
var mongoose = require('mongoose');
var winston = require('winston');

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
  this.create = function(req, res) {
	var item = new Item(req.body);
    item.save( function(err){
      if(err) { 
		winston.warn(err);
		return res.status(400).json({error:err.message}) 
	  }
        
      if(res){
        return res.status(200).json(item);
      }
    });  
  }
  
  // Normal update refuses to run validators
  this.update = customUpdate;
  this.remove = function(req, res) {
	req.Item.remove(function(err) {
	  if (err) return res.status(400).json(err);
	  res.status(200).json({});
    });
  }//defaultCtrl.remove;

  return this;
}

function customUpdate(req, res) {
  //console.log(JSON.stringify(req.body));
  if ("in_stock" in req.body && !("available" in req.body)) {
    updateInStock(req, res);
  }
  else if (!("in_stock" in req.body) && "available" in req.body) {
	updateAvailable(req, res);
  }
  else if("in_stock" in req.body && "available" in req.body) {  
	req.Item.available = req.body.available;
	req.Item.in_stock = req.body.in_stock;
  }
  
  req.Item.save(function(err) {
	if (err) { return res.status(400).json({error:err.message}); }
	else { res.status(200).json(req.Loan); }
  });
}

function updateInStock(req, res) {
  var delta_stock = req.body.in_stock - req.Item.in_stock;
  if (req.Item.available + delta_stock <= 0) {
	return res.status(400).json({error:"Cannot change in_stock in this manner, would result in negative availability"});
  }
  else {
	req.Item.in_stock = req.body.in_stock;
	req.Item.available = req.Item.available + delta_stock;
  }    
}

function updateAvailable(req, res) {
  var delta_stock = req.body.available - req.Item.available;
  req.Item.available = req.body.available;
  req.Item.in_stock = req.Item.in_stock + delta_stock;
}

module.exports = Controller;
