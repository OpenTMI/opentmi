// 3rd party modules
const _ = require('lodash');
const mongoose = require('mongoose');

// Application modules
const logger = require('../tools/logger');

const User = mongoose.model('User');


class SocketIOController {
  constructor(socket) {
    this._socket = socket;
    logger.info(`New ${this.isAdmin ? 'admin' : 'user'} (ip: ${this.ipAddress}, id: ${this.id}) connected to IO`);
    logger.silly(`Current clients: ${Object.keys(SocketIOController.clients).length}`);
    SocketIOController.clients[this.id] = this;
    this._lastActivity = new Date();
  }

  /**
   * Called when client disconnects
   */
  disconnect() {
    delete SocketIOController.clients[this.id];
    logger.info(`IO ${this.isAdmin ? 'admin' : 'user'} (ip: ${this.ipAddress}, id: ${this.id}) disconnected`);
  }

  /**
   * Fetch user details from DB, including token data
   * @param callback(error, userdata)
   */
  whoami(callback) {
    logger.silly('whoami via IO called..');
    this.user()
      .then((user) => {
        const data = {
          isAdmin: this.isAdmin,
          lastActivity: this.lastActivity
        };
        if (user) {
          _.merge(data, user.toJSON());
        } else {
          _.merge(data, this.decodedToken);
          logger.warn(`SocketIO client user (id: ${this.id}) is not in DB!`);
        }
        callback(null, data);
      })
      .catch(callback)
      .finally(this.activity.bind(this));
  }
  //  helpers
  activity() {
    const promise = Promise.resolve(this._lastActivity);
    this._lastActivity = new Date();
    return promise;
  }

  get ipAddress() {
    return _.get(this._socket, 'request.connection.remoteAddress');
  }
  get lastActivity() {
    return this._lastActivity;
  }
  get decodedToken() {
    return this._socket.decoded_token;
  }
  get id() {
    return this.decodedToken._id;
  }
  get groups() {
    return _.get(this.decodedToken, 'groups', []);
  }
  belongToGroup(group) {
    return _.find(this.groups, {name: group}) !== -1;
  }
  user() {
    return User.findById(this.id).exec();
  }
  get isAdmin() {
    return this.belongToGroup('admins');
  }
}
SocketIOController.clients = {};

module.exports = SocketIOController;
