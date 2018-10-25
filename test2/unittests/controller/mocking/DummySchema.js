const mongoose = require('mongoose');
const QueryPlugin = require('mongoose-query');

// Define testing schema
const DummyItemSchema = new mongoose.Schema({
  text_unique_sparse: {type: String, unique: true, sparse: true},
  text_unique_required: {type: String, unique: true, required: true},
  text_freeform: {type: String},
  number_defaulted_pos: {type: Number, default: 0, min: 0},
  number_required: {type: Number, required: true},
  number_freeform: {type: Number},
  string_enum: {
    type: String,
    enum: [
      'category1',
      'category2',
      'category3',
      'category4'
    ],
    default: 'category1'},
  date: {type: Date}
});
DummyItemSchema.plugin(QueryPlugin);


module.exports = DummyItemSchema;
