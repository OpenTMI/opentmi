const Updater = require('./updater');

class NpmUpdater extends Updater {
  _update() { // eslint-disable-line class-methods-use-this
    return Promise.reject(new Error('Not supported'));
  }

  version() { return super.version(); }
}

module.exports = NpmUpdater;
