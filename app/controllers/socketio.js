// 3rd party modules
const _ = require('lodash');

// Application modules
const logger = require('../tools/logger');


class SocketIOController {
  constructor(socket) {
    this._socket = socket;
    logger.info(`New IO connection: ${this.decodedToken._id} ${this.isAdmin ? 'admin' : ''}`);
  }
  get decodedToken() {
    return this._socket.decoded_token;
  }
  get _id() {
    return this.decodedToken._id;
  }
  /*
  user() {
    // @todo need one more abstraction between controller and mongoose..
    return User.findById(this._id).exec();
  } */
  get isAdmin() {
    const groups = _.get(this.decodedToken, 'groups', []);
    return _.find(groups, {name: 'admins'}) !== -1;
  }
  disconnect() {
    logger.info(`IO client disconnected: ${this.decodedToken._id}`);
  }
  whoami(callback) {
    logger.silly('whoami via IO called..');
    callback(null, _.defaults(this.decodedToken, {isAdmin: this.isAdmin}));
  }
}

module.exports = SocketIOController;
