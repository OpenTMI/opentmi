// native modules
const EventEmitter = require('events').EventEmitter;
// 3rd party modules
const _ = require('lodash');
const Promise = require('bluebird');
// application modules
const Npm = require('./npm');


class Updater extends EventEmitter {
  constructor(cwd = __dirname, env = _.pick(process.env, ['PWD', 'PATH', 'HOME'])) {
    super();
    this._options = {cwd, env};
    this._pending = Promise.resolve();
  }
  update(revision) {
    if (this._pending.isPending()) {
      return Promise.reject('Updating in progress.');
    }
    let currentVersion;
    this._pending = this
      .version()
      .then((version) => { currentVersion = version; })
      .then(() => this._update(revision)
        .catch(error => this._revert(currentVersion).then(() => {
          throw new Error(`Updating fails${error}`);
        }).catch((revertError) => {
          throw new Error(`Updating fails - tried to revert to original version but it fails to ${revertError}`);
        }))
      );
    return this._pending;
  }
  _version() {
    if (this._pending.isPending()) {
      return Promise.reject('Updating in progress.');
    }
    return Npm.list(super._options);
  }
  _revert(version) {
    // @todo...
    return Promise.reject("Not implemented");
  }
  restart() {
    if (this._pending.isPending()) {
      return Promise.reject('Updating in progress.');
    }
    // @todo eventBus.emit("");
    return Promise.reject("Not implemented");
  }
}

module.exports = Updater;
