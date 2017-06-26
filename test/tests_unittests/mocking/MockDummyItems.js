const mongoose = require('mongoose');

// Add mock data
const mockDummies = [{
  _id: mongoose.Types.ObjectId(),
  text_unique_sparse: 'stuff_1_2_3',
  text_unique_required: 'secondary_stuff_2_4_6',
  text_freeform: 'random stuff',
  number_defaulted_pos: 73,
  number_required: 9314,
  number_freeform: 42063,
  string_enum: 'category2',
  date: new Date('01.02.2017'),
}, {
  text_unique_sparse: 'another stuff',
  text_unique_required: 'another secondary_stuff',
  text_freeform: 'another random stuff',
  number_defaulted_pos: 974,
  number_required: 13046,
  number_freeform: 15285,
  string_enum: 'category3',
  date: new Date('07.11.2017'),
}];


module.exports = mockDummies;
