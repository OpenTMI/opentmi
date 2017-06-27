/**
  Users Controller
*/

// 3rd party modules

// Own modules
const DefaultController = require('./');

class UsersController extends DefaultController {
  constructor() {
    super('User');
  }
}


module.exports = UsersController;
