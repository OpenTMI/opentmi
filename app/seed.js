var winston = require('winston');
var mongoose = require('mongoose');

// Logs error and exits the process if one has happened 
var checkForError = function(err) {
  if (err) {
    winston.error(error);
    process.exit(-1);
  }
};

// Initialize root lists from which seed entries are generated
var item_roots = [
  {name:'Board_type_1'   , type:'board'},
  {name:'Board_type_2'   , type:'board'},
  {name:'Cable_short'    , type:'accessory'},
  {name:'Cable_long'     , type:'accessory'},
  {name:'Cable_medium'   , type:'accessory'},
  {name:'Receiver_type_1', type:'component'} ];

var user_roots = [
  'Kalle',
  'Make',
  'Viljami',
  'Simo',
  'Seppo',
  'Juhani' ];

var loan_seeds = [
  {user:0, item:1},
  {user:2, item:0},
  {user:4, item:5} ];

// id's of generated items & users
var items = [];
var users = [];

// fetch models used
var Item = mongoose.model('Item');
var User = mongoose.model('User');
var Loan = mongoose.model('Loan');

// Make sure database is not already seeded
Item.count( {}, function(error, count) {
  if (count <= 0)
    createItemSeed();
});

// Pushes documents to database based on objects in item_roots
function createItemSeed() {
  winston.log('Inserting seed items');
  // Recursive function to create items syncronously
  var recursiveAddItem = function(items_left) {
    items_left -= 1;
    var item = new Item({ 
      barcode            : 'AA75BCEF' + items_left,
      name               : item_roots[items_left].name,
      text_description   : 'This is an item.',
      external_reference : 'https://developer.mbed.org/platforms/ARM-MPS2/',
      in_stock           : 100,
      available          : 4 + items_left,
      date_created       : Date(2016, 10, 29, 0, 0, 0, 0),
      category           : item_roots[items_left].type });
  
    // Save the created model in the database
    item.save(function(err, new_item) {
      checkForError(err);     
      items.push(new_item);
      // Call self again if items_left is greater than zero
      if (items_left > 0)
        recursiveAddItem(items_left);
      else
        createUserSeed();
    });
  }

  // Start recursion
  recursiveAddItem(item_roots.length);
}

// Pushes user documents to database based on objects in user_roots
function createUserSeed() {
  winston.log('Inserting seed users');
  // Recursive function to create users syncronously
  var recursiveAddUser = function(users_left) {
    users_left -= 1;
    var user = new User({
      name        : user_roots[users_left],
      email       : user_roots[users_left] + '@fakemail.se',
      displayName : 'Kari',
      registered  : Date(2016, 10, 20, 0, 0, 0, 0),
      lastVisited : Date(2016, 11,  8, 0, 0, 0, 0) });
  
    // Save the created model in the database
    user.save(function(err, new_user) {
      checkForError();    
      users.push(new_user);
      // Call self again only if users_left is greater than zero
      if (users_left > 0) 
        recursiveAddUser(users_left);
      else
        createLoanSeed();
    });
  }

  // Start recursion
  recursiveAddUser(user_roots.length);
}

// Pushes documents to database based on objects in loan_seeds
function createLoanSeed() {
  winston.log('Inserting loans');
  for (var i = 0; i < loan_seeds.length; i++) {
    var loan = new Loan({
      count       : i,
      date_loaned : Date(),
      loaner      : users[loan_seeds[i].user].id,
      loaned_item : items[loan_seeds[i].item].id });
    
    // Save the created model in the database
    loan.save(checkForError);
  }
}
