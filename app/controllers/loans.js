/**
  Loans Controller 
*/

//3rd party modules
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
  this.get = defaultCtrl.get;
  this.find = defaultCtrl.find;
  this.create = defaultCtrl.create;
  this.update = defaultCtrl.update;
  this.remove = defaultCtrl.remove;

  this.me = function(req, res) {
    Loan.find({loaner: req.user})
    .populate('loaned_item')
    .exec(function(err, loans) {
      res.json(loans);
    })
  }

  return this;
}

module.exports = Controller;
