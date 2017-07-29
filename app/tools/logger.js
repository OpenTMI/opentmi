const cluster = require('cluster');
const Winston = require('winston');
const WinstonDailyRotateFile = require('winston-daily-rotate-file');


class ClusterLogger {
  constructor() {
    this._emitter = process;
  }
  _proxy(level, ...args) {
    this._emitter.send({type: 'log', level, args});
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
}
if (cluster.isMaster) {
  const logger = Winston;
  // Define logger behaviour
  logger.cli(); // activates colors

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
