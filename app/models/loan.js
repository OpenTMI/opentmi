var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Types = Schema.Types;
var ObjectId = Types.ObjectId;

var QueryPlugin = require('mongoose-query');

var LoanSchema = new Schema({
  count : { type:Number, required: true },
  date_loaned : { type:Date, required: true, default: Date.now},
  date_returned : { type:Date },
  loaner : { type:ObjectId, ref:'User', required: true },                  
  loaned_item : { type:ObjectId, ref:'Item', required: true }
});

/**
 * Query plugin
 */
LoanSchema.plugin( QueryPlugin ); //install QueryPlugin

mongoose.model("Loan", LoanSchema);
