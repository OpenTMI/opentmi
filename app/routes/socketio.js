// Third party modules
const socketioJwt = require('socketio-jwt');

// Application modules
const nconf = require('../../config');
const Controller = require('../../app/controllers/socketio');

// Route variables
const TOKEN_SECRET = nconf.get('webtoken');

function Route(app, io) {
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
