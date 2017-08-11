const Updater = require('./updater');

class NpmUpdater extends Updater {
  _update() {
    return Promise.reject('Not supported');
  }
  version() { return super._version(); }
}

module.exports = NpmUpdater;
