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
    const user = socket.decoded_token;
    socket.isAdmin = _.find(groups, {name: 'admins'}) === 'admins'; // eslint-disable-line no-param-reassign
    logger.info(`New IO connection: ${JSON.stringify(user._id)} ${socket.isAdmin ? 'admin' : ''}`);
    socket.on('disconnect', () => {
      logger.info(`IO client disconnected: ${user._id}`);
    });
  });
}
module.exports = Route;
