const mongoose = require('mongoose');

// Add mock data
const mockItems = [
  {
    _id: mongoose.Types.ObjectId(),
    name: 'testing_item',
    in_stock: 35,
    available: 10,
    category: 'accessory',
  }, {
    _id: mongoose.Types.ObjectId(),
    name: 'another_item',
    in_stock: 15,
    available: 6,
    category: 'board',
  },
];

module.exports = mockItems;
