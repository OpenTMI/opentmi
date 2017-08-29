// native modules
const EventEmitter = require('events').EventEmitter;

// 3rd party modules
const _ = require('lodash');
const Promise = require('bluebird');

// application modules
const Npm = require('./npm');
const eventBus = require('../eventBus');
const logger = require('../logger');

class Updater extends EventEmitter {
  constructor(cwd = __dirname, env = _.pick(process.env, ['PWD', 'PATH', 'HOME'])) {
    super();

    this._options = {
      cwd,
      env: Object.assign({}, process.env, env)
    };

    this._pending = Promise.resolve();
    this.npm = new Npm();
  }
  update(revision) {
    if (this._pending.isPending()) {
      return Promise.reject(new Error('Cannot update, pending action exists.'));
    }

    let currentVersion;
    this._pending = this.version()
      .then((version) => { currentVersion = version; })
      .then(() => {
        logger.info(`Updating to version: ${revision}...`);
        return this._update(revision)
          .catch((error) => {
            const _error = error;
            logger.error(`Update failed: ${error.message}.`);
            return this._revert(currentVersion)
              .catch((revertError) => {
                const revertResult = `failed to revert back to previous version, ${revertError.message}`;
                _error.message = `error: ${error.message}\nrevert: ${revertResult}`;
                throw _error;
              })
              .then(() => {
                const revertResult = `reverted back to version: ${currentVersion}`;
                _error.message = `error: ${error.message}\nrevert: ${revertResult}`;
                throw _error;
              });
          });
      }).catch((error) => {
        const _error = error;
        _error.message = `Update failed: ${error.message}`;
        throw _error;
      });

    return this._pending;
  }

  _update(revision) { // eslint-disable-line
    return Promise.reject();
  }

  _revert(version) { // eslint-disable-line class-methods-use-this
    logger.info(`Reverting back to version: ${version}.`);

    // @todo...
    return Promise.reject(new Error('Not implemented'));
  }

  version() {
    if (this._pending.isPending()) {
      return Promise.reject('Cannot fetch version, pending action exists.');
    }
    return this.npm.list(this._options);
  }

  restart() {
    if (this._pending.isPending()) {
      return Promise.reject('Updating in progress.');
    }

    eventBus.emit('workerRestartNeeded', 'Request from updater tool.');
    return Promise.resolve('Server will be restarted.');
  }
}

module.exports = Updater;
