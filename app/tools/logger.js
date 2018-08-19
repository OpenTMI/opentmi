// Native components
const cluster = require('cluster');
const path = require('path');
const fs = require('fs');

// Third party components
const {createLogger, format, transports} = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Application components
const config = require('../../config/index');

// Setup
const verbose = config.get('verbose');
const silent = config.get('silent');
const environment = config.get('env');

const logDir = path.resolve(__dirname, '..', '..', 'log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logFile = path.join(logDir, 'app.log');

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

class MasterLogger {
  constructor() {
    // @todo File logging options should be fetched from config file
    const options = {
      format: format.combine(
        format.colorize(),
        format.splat(),
        format.simple()
      )
    };
    this.logger = createLogger(options);
    // add console transport
    if(!silent) {
      this.logger.add(new transports.Console({
        colorize: true,
        level: silent ? 'error' : ['info', 'debug', 'verbose', 'silly'][verbose % 4]
      }));
    }
    // Add winston file logger, which rotates daily
    const fileLevel = 'silly';
    this.logger.add(
      new DailyRotateFile({
        filename: logFile,
        json: false,
        handleExceptions: false,
        level: fileLevel,
        datePatter: '.yyyy-MM-dd_HH-mm.log'
      }));
    // Print current config
    this.logger.info(`Using cfg: ${environment}.`);
  }
  set level(level) {
    this.logger.level = level;
  }

  handleWorkerLog(worker, data) {
    const level = data['level'] || 'debug';
    const args = data['args'] || [''];
    args[0] = `<Worker#${worker.id}> ${args[0]}`;
    try {
      this.logger.log(level, ...args);
    } catch (error) {
      this.logger.error(data);
      this.logger.error(error);
    }
  }
  log(level, ...args) {
    const data = args || [''];
    data[0] = `<Master> ${data[0]}`;
    this.logger.log(level, ...data);
  }
  error(...args) {
    this.log('error', ...args);
  }
  warn(...args) {
    this.log('warn', ...args);
  }
  info(...args) {
    this.log('info', ...args);
  }
  debug(...args) {
    this.log('debug', ...args);
  }
  verbose(...args) {
    this.log('verbose', ...args);
  }
  silly(...args) {
    this.log('silly', ...args);
  }
}

class WorkerLogger {
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

  log(level, ...args) {
    this._proxy(level, ...args);
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


module.exports = cluster.isMaster ? new MasterLogger() : new WorkerLogger();
