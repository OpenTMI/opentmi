// Native modules
const childProcess = require('child_process');

// Third party modules
const Promise = require('bluebird');

// Application modules
const logger = require('../logger');

// Variables
const exec = Promise.promisify(childProcess.exec);

class Npm {
  constructor(execModule = exec) {
    this.exec = execModule;
  }

  /**
   * Get version from `npm list`
   * @param execOptions
   */
  list(execOptions) {
    const cmd = 'npm list --json --depth=0 --prod';
    // @todo if dependencies has messed up this might be rejected.
    // uncomment above line to ignore stderr and pass everytime
    // cmd += ' 2>/dev/null || true';
    logger.silly('Reading npm packages');
    const _options = {maxBuffer: 1024 * 1024, ...execOptions};
    return this.exec(cmd, _options)
      .then((stdout) => JSON.parse(stdout))
      .catch((error) => {
        throw new Error(`npm list failed: ${error.message}`);
      });
  }

  /**
   * get results from `npm version`
   * @param {object} execOptions
   */
  version(execOptions) {
    const cmd = 'npm version --json';
    // @todo if dependencies has messed up this might be rejected.
    // uncomment above line to ignore stderr and pass everytime
    // cmd += ' 2>/dev/null || true';
    logger.silly('Reading npm packages');
    const _options = {maxBuffer: 1024 * 1024, ...execOptions};
    return this.exec(cmd, _options)
      .then((stdout) => JSON.parse(stdout))
      .catch((error) => {
        throw new Error(`npm version failed: ${error.message}`);
      });
  }

  /**
   *
   * @param {*} execOptions
   * @param {*} options
   * @todo emit installation stream back to client/admin
   */
  install(execOptions, options = '--on-optional --only=production') {
    const cmd = `npm install ${options}`;
    return this.exec(cmd, execOptions)
      .then(() => this.list(execOptions))
      .catch((error) => {
        throw new Error(`npm install failed: ${error.message}`);
      });
  }
}

module.exports = Npm;
