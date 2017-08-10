// native modules
const childProcess = require('child_process');
// 3rd party modules
const Promise = require('bluebird');
// application modules
const Updater = require('./updater');
const Npm = require('./npm');

const exec = Promise.promisify(childProcess.exec);


class GitUpdater extends Updater {
  _update(revision) {
    return this._isClean()
      .catch(() => this._reset())
      .then(() => this.emit('status', `checkout revision ${revision}..`))
      .then(() => this._checkout(revision))
      .then(() => this.emit('status', 'install npm dependencies..'))
      .then(() => Npm.install(this._options).bind(this));
  }

  _isClean() {
    const cmd = 'git diff --quiet HEAD';
    return exec(cmd, this._options).catch(() => {
      throw new Error('workarea are not clean');
    });
  }
  _reset(options = '--hard') {
    const cmd = `git reset ${options}`;
    return exec(cmd, this._options).catch((error) => {
      throw new Error(`resetting workarea fails! error: ${error.message}`);
    });
  }
  _fetch() {
    const cmd = 'git -c core.askpass=true _fetch --all --tags --prune';
    return exec(cmd, this._options).catch((error) => {
      throw new Error(`git fetch fails: ${error.message}`);
    });
  }
  _checkout(revision) {
    const cmd = `git checkout ${revision}`;
    return exec(cmd, this._options).catch((error) => {
      throw new Error(`git checkout fails: ${error.message}`);
    });
  }
}

module.exports = GitUpdater;

/*
const git = new GitUpdater();
git._isClean()
  .catch(() => git._reset())
// .then( console.log )
  .then(() => git.version())
  .then(console.log)
  .catch((error, stderr) => console.error(`error: ${error}, stderr: ${stderr}, code: ${error.code}`));
*/