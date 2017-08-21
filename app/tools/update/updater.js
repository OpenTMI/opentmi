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
    this._options = {cwd, env};
    this._pending = Promise.resolve();
    this.npm = new Npm();
  }
  update(revision) {
    if (this._pending.isPending()) {
      return Promise.reject('Cannot update, updating already in progress.');
    }

    let currentVersion;
    this._pending = this.version()
      .then((version) => { currentVersion = version; })
      .then(() => {
        logger.info(`Updating to version: ${currentVersion}...`);
        return this._update(revision).catch((error) => {
          const _error = error;
          logger.error(`Update failed: ${error.message}.`);
          return this._revert(currentVersion).catch((revertError) => {
            const revertResult = `failed to revert back to previous version, ${revertError.message}`;
            _error.message = `error: ${error.message}\nrevert: ${revertResult}`;
            throw _error;
          }).then(() => {
            const revertResult = `reverted back to version: ${currentVersion}`;
            _error.message = `error: ${error.message}\nrevert: ${revertResult}`;
            throw _error;
          });
        });
      })
      .catch((error) => {
        throw new Error(`Update failed: ${error}`);
      });

    return this._pending;
  }

  _update() { // eslint-disable-line class-methods-use-this
    return Promise.reject();
  }

  version() {
    if (this._pending.isPending()) {
      return Promise.reject('Updating in progress');
    }
    return this.npm.list(super._options);
  }

  _revert(version) { // eslint-disable-line class-methods-use-this
    logger.info(`Reverting back to version: ${version}.`);

    // @todo...
    return Promise.reject('Not implemented');
  }

  restart() {
    if (this._pending.isPending()) {
      return Promise.reject('Updating in progress.');
    }

    eventBus.emit('workerRestartNeeded', 'Request from updater tool.');
    return Promise.reject('Not implemented');
  }
}

module.exports = Updater;
