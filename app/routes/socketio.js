// Third party modules
const socketioJwt = require('socketio-jwt');

// Application modules
const nconf = require('../../config');
const Controller = require('../controllers/socketio');
const logger = require('../tools/logger');

// Route variables
const TOKEN_SECRET = nconf.get('webtoken');

function Route(app, io) {
  let attemptToClose = false;
  process.on('SIGINT', () => {attemptToClose = true;});
  io.use((socket, next) => {
    if (attemptToClose) {
      logger.debug('client tried to open IO connection - server is going down...');
      socket.disconnect(true);
      return next(new Error('closing in progress..'));
    }
    return next();
  });

  // IO security
  io.use(socketioJwt.authorize({
    secret: TOKEN_SECRET,
    handshake: true,
    callback: false
  }));

  io.on('connection', (socket) => {
    const controller = new Controller(socket);
    socket.on('disconnect', controller.disconnect.bind(controller));
    socket.on('whoami', controller.whoami.bind(controller));
  });
}
module.exports = Route;
