// native modules
const childProcess = require('child_process');
// 3rd party modules
const Promise = require('bluebird');
const _ = require('lodash');
// application modules
const Updater = require('./updater');
const Npm = require('./npm');

const exec = Promise.promisify(childProcess.exec);


class GitUpdater extends Updater {
  _update(revision) {
    return this._isClean()
      .catch(() => this._reset())
      .then(() => {
        this.emit('status', 'cleaning workspace');
        return this._clean();
      })
      .then(() => {
        this.emit('status', `checking out revision: ${revision}`);
        return this._checkout(revision);
      })
      .then(() => {
        this.emit('status', 'installing npm dependencies');
        return Npm.install(this._options).bind(this);
      });
  }

  version() {
    const gitVersion = this._commitId()
      .then(commitId => this._tag(commitId)
        .then(tag => _.merge(commitId, tag)));

    return Promise
      .all([super.version(), gitVersion])
      .then(versions => _.merge({}, versions[0], versions[1]));
  }

  _isClean() {
    const cmd = 'git diff --quiet HEAD';
    return exec(cmd, this._options).catch(() => {
      throw new Error('workspace is not clean');
    });
  }

  _tag(commitId = this._commitId()) {
    const cmd = `git describe --exact-match --tags ${commitId}`;
    return exec(cmd, this._options)
      .then(line => ({tag: line.trim()}))
      .catch(() => ({tag: undefined}));
  }

  _commitId() {
    const cmd = 'git rev-parse --verify HEAD';
    return exec(cmd, this._options)
      .then(line => ({commitId: line.trim()}))
      .catch((error) => {
        throw new Error(`git rev-parse failed: ${error.message}`);
      });
  }

  _reset(options = '--hard') {
    const cmd = `git reset ${options}`;
    return exec(cmd, this._options).catch((error) => {
      throw new Error(`git reset failed: ${error.message}`);
    });
  }

  _fetch() {
    const cmd = 'git -c core.askpass=true _fetch --all --tags --prune';
    return exec(cmd, this._options).catch((error) => {
      throw new Error(`git fetch failed: ${error.message}`);
    });
  }

  _clean() {
    const cmd = 'git clean -f -d';
    return exec(cmd, this._options).catch((error) => {
      throw new Error(`git clean failed: ${error.message}`);
    });
  }

  _checkout(revision) {
    const cmd = `git checkout ${revision}`;
    return exec(cmd, this._options).catch((error) => {
      throw new Error(`git checkout failed: ${error.message}`);
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
