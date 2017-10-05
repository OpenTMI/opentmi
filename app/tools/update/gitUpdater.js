// Native modules
const childProcess = require('child_process');

// Third party modules
const Promise = require('bluebird');

// Application modules
const Updater = require('./updater');
const Npm = require('./npm');

const exec = Promise.promisify(childProcess.exec);


class GitUpdater extends Updater {
  constructor(cwd, env, execModule = exec) {
    super(cwd, env);
    this.exec = execModule;
    this.npm = new Npm(exec);
  }

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
        return this.npm.install(this._options);
      });
  }

  version(deep = false) {
    const gitVersion = this._commitId()
      .then(obj => this._tag(obj.commitId)
        .then(tag => Object.assign({commitId: obj.commitId}, tag)));
    return Promise
      .all([super.version(deep), gitVersion])
      .then(versions => Object.assign({}, versions[0], versions[1]));
  }

  _isClean() {
    const cmd = 'git diff --quiet HEAD';
    return this.exec(cmd, this._options).catch(() => {
      throw new Error('workspace is not clean');
    });
  }

  _tag(commitId) {
    const cmd = `git describe --exact-match --tags ${commitId}`;
    return this.exec(cmd, this._options)
      .then(line => ({tag: line.trim()}))
      .catch(() => ({tag: undefined}));
  }

  _commitId() {
    const cmd = 'git rev-parse --verify HEAD';
    return this.exec(cmd, this._options)
      .then(line => ({commitId: line.trim()}))
      .catch((error) => {
        throw new Error(`git rev-parse failed: ${error.message}`);
      });
  }

  _reset(options = '--hard') {
    const cmd = `git reset ${options}`;
    return this.exec(cmd, this._options).catch((error) => {
      throw new Error(`git reset failed: ${error.message}`);
    });
  }

  _fetch() {
    const cmd = 'git -c core.askpass=true _fetch --all --tags --prune';
    return this.exec(cmd, this._options).catch((error) => {
      throw new Error(`git fetch failed: ${error.message}`);
    });
  }

  _clean() {
    const cmd = 'git clean -f -d';
    return this.exec(cmd, this._options).catch((error) => {
      throw new Error(`git clean failed: ${error.message}`);
    });
  }

  _checkout(revision) {
    const cmd = `git checkout ${revision}`;
    return this.exec(cmd, this._options).catch((error) => {
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
