const Updater = require('./updater');

class NpmUpdater extends Updater {
  _update() {
    return Promise.reject('Not supported');
  }
  version() { return super.version(); }
}

module.exports = NpmUpdater;
