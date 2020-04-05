// Third party modules
const cluster = require('cluster');
const socketioJwt = require('socketio-jwt');
const _ = require('lodash');

// Application modules
const nconf = require('../tools/config');
const Controller = require('../controllers/socketio');
const logger = require('../tools/logger');
const eventBus = require('../tools/eventBus');
const SocketLoggerTransport = require('../tools/SocketLoggerTransport');

// Route variables
const TOKEN_SECRET = nconf.get('webtoken');

function Route(app, io) {
  let attemptToClose = false;
  process.on('SIGINT', () => { attemptToClose = true; });
  io.use((socket, next) => {
    if (attemptToClose) {
      logger.debug('client tried to open IO connection - server is going down...');
      socket.disconnect(true);
      return next(new Error('closing in progress..'));
    }
    return next();
  });

  // IO security
  const authorize = socketioJwt.authorize({
    secret: TOKEN_SECRET,
    handshake: true,
    callback: false
  });
  io.use(authorize);

  if (cluster.isMaster) {
    try {
      logger.logger.add(new SocketLoggerTransport(io));
    } catch (error) {
      logger.warn(`Cant create socket logger transport: ${error}`);
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  const ioEvents = ['disconnect', 'whoami', 'join', 'leave'];

  io.on('connection', (socket) => {
    const controller = new Controller(socket);
    _.each(ioEvents, event => socket.on(event, controller[event].bind(controller)));
  });
  const resultNS = io.of('results');
  resultNS.use(authorize);
  eventBus.on('result.new', (bus, result) => {
    logger.silly(`Broadcast new result: ${result._id}`);
    resultNS.emit('new', result);
  });
}

module.exports = Route;
