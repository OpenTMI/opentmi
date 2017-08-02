const cluster = require('cluster');
const Winston = require('winston');
const WinstonDailyRotateFile = require('winston-daily-rotate-file');
const nconf = require('../../config');

const verbose = nconf.get('verbose');
const silent = nconf.get('silent');
const configuration = nconf.get('cfg');

function _parseError(error) {
  const jsonObj = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    __error__: true
  };

  Object.keys(error).forEach((key) => {
    if (!jsonObj[key]) { jsonObj[key] = error[key]; }
  });

  return jsonObj;
}

class ClusterLogger {
  constructor() {
    this._emitter = process;
  }
  _proxy(level, ...args) {
    const editedArgs = args;
    Object.keys(args).forEach((key) => {
      if (args[key] instanceof Error) {
        editedArgs[key] = _parseError(args[key]);
      }
    });
    if (process.connected) {
      // @todo better intercommunication..
      this._emitter.send({type: 'log', level, args: editedArgs});
    }
  }
  set level(level) {
    this.warn('Not implemented');
  }
  log(level, msg, meta) {
    this._proxy(level, msg, meta);
  }
  error(...args) {
    this._proxy('error', ...args);
  }
  debug(...args) {
    this._proxy('debug', ...args);
  }
  info(...args) {
    this._proxy('info', ...args);
  }
  warn(...args) {
    this._proxy('warn', ...args);
  }
  silly(...args) {
    this._proxy('silly', ...args);
  }
  verbose(...args) {
    this._proxy('verbose', ...args);
  }
}

if (cluster.isMaster) {
  const logger = Winston;
  // Define logger behaviour
  logger.cli(); // activates colors

  // define console logging level
  logger.level = silent ? 'error' : ['info', 'debug', 'verbose', 'silly'][verbose % 4];
  logger.debug(`Using cfg: ${configuration}`);

  // Add winston file logger, which rotates daily
  const fileLevel = 'silly';
  logger.add(WinstonDailyRotateFile, {
    filename: '../log/app.log',
    json: false,
    handleExceptions: false,
    level: fileLevel,
    datePatter: '.yyyy-MM-dd_HH-mm'
  });
  module.exports = logger;
} else {
  module.exports = new ClusterLogger();
}
