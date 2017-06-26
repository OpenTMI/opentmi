const mongoose = require('mongoose');

// Add mock data
const mockItems = [
  {
    _id: mongoose.Types.ObjectId(),
    name: 'das_item',
    in_stock: 35,
    available: 10,
    category: 'board',
  },
  {
    _id: mongoose.Types.ObjectId(),
    name: 'void_item',
    in_stock: 12,
    available: 8,
    category: 'board',
  },
  {
    _id: mongoose.Types.ObjectId(),
    name: 'testing_item',
    in_stock: 9,
    available: 8,
    category: 'accessory',
  }, {
    _id: mongoose.Types.ObjectId(),
    name: 'another_item',
    in_stock: 15,
    available: 6,
    category: 'board',
  }, {
    _id: mongoose.Types.ObjectId(),
    name: 'third_item',
    in_stock: 3,
    available: 2,
    category: 'accessory',
  }, {
    _id: mongoose.Types.ObjectId(),
    name: 'fourth_item',
    in_stock: 100,
    available: 67,
    category: 'board',
  },
];

module.exports = mockItems;
