const Updater = require('./updater');

class NpmUpdater extends Updater {
  _update() {
    return Promise.reject('Not supported');
  }
}

module.exports = NpmUpdater;
