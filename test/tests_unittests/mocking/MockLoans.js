// Third party modules
const mongoose = require('mongoose');

// Local modules
const mockUsers = require('./MockUsers');
const mockItems = require('./MockItems');

const mockLoans = [
  {
    _id: mongoose.Types.ObjectId(),
    loan_date: new Date(),
    loaner: mockUsers[0]._id,
    items: [
      {
        item: mockItems[0]._id,
        resource: undefined,
      }, {
        item: mockItems[0]._id,
        resource: undefined,
      }, {
        item: mockItems[0]._id,
        resource: undefined,
      },
    ],
  },
];


module.exports = mockLoans;
