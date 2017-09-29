// Third party modules
const socketioJwt = require('socketio-jwt');
const _ = require('lodash');

// Application modules
const nconf = require('../../config');
const logger = require('../../app/tools/logger');

// Route variables
const TOKEN_SECRET = nconf.get('webtoken');

function Route(app, io) {
  logger.debug('register socketio-jwt middleware');

  // IO security
  io.use(socketioJwt.authorize({
    secret: TOKEN_SECRET,
    handshake: true,
    callback: false
  }));

  io.on('connection', (socket) => {
    const groups = _.get(socket, 'decoded_token.groups');
    socket.isAdmin = _.find(groups, 'admins') === 'admins';
    logger.info(`New IO connection: ${JSON.stringify(socket.decoded_token)} ${socket.isAdmin ? 'admin' : ''}`);
    socket.on('disconnect', () => {
      logger.info('IO client disconnected: ', socket);
    });
    socket.on('pong', latency => logger.info(`pong latency: ${latency}`));
    socket.on('ping', latency => logger.info(`ping latency: ${latency}`));
  });
}
module.exports = Route;
