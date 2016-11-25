var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Types = Schema.Types;
var ObjectId = Types.ObjectId;

var QueryPlugin = require('mongoose-query');

var LoanSchema = new Schema({
  loan_date : { type:Date, required: true, default: Date.now},
  loaner : { type:ObjectId, ref:'User', required: true },                  
  items : [ {
	  item : { type:ObjectId, ref:'Item', required:true }, 
	  return_date : { type:Date },
	  resource : { type:ObjectId, ref:'Resource' }
  }]
});

/**
 * Query plugin
 */
LoanSchema.plugin( QueryPlugin ); //install QueryPlugin

mongoose.model("Loan", LoanSchema);
