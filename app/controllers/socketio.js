// 3rd party modules
const _ = require('lodash');
const mongoose = require('mongoose');

// Application modules
const logger = require('../tools/logger');
const SocketLoggerTransport = require('../tools/SocketLoggerTransport');

const User = mongoose.model('User');


class SocketIOController {
  constructor(socket, io) {
    this._socket = socket;
    this._io = io
    logger.info(`New ${this.isAdmin ? 'admin' : 'user'} (ip: ${this.ipAddress}, id: ${this.id}) connected to IO`);
    logger.silly(`Current clients: ${Object.keys(SocketIOController.clients).length}`);
    SocketIOController.clients[this.id] = this;
    this._lastActivity = new Date();
    logger.logger.add(new SocketLoggerTransport(io));
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

  async join({room}, callback) {
    if (!['logs'].includes(room)) {
      logger.warn(`Trying to join room that does not exists: ${room}`);
      callback(new Error('room does not exists'));
      return;
    }
    logger.info(`New user join to room: ${room}`)
    await this._socket.join(room)
    this._io.to(room).emit('log', 'New user joined to room\n');
  }

  async leave(room) {
    await this._socket.leave(room)
    this._io.to(room).emit('log', 'user leave from room\n');
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
