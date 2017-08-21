// Native modules
const childProcess = require('child_process');

// Third party modules
const Promise = require('bluebird');
const _ = require('lodash');

// app modules
const logger = require('../logger');

const exec = Promise.promisify(childProcess.exec);


class Npm {
  static list(execOptions) {
    const cmd = 'npm list --json --depth=0 --prod';
    logger.silly('Reading npm packages');
    const _options = _.defaults({maxBuffer: 1024 * 1024}, execOptions);
    return exec(cmd, _options).catch((error) => {
      throw new Error(`npm list fails: ${error.message}`);
    }).then(stdout => JSON.parse(stdout));
  }

  /**
   * 
   * @param {*} execOptions 
   * @param {*} options
   * @todo emit installation stream back to client/admin 
   */
  static install(execOptions, options = '--on-optional --only=production') {
    const cmd = `npm install ${options}`;
    return exec(cmd, execOptions).catch((error) => {
      throw new Error(`'npm install fails': ${error.message}`);
    }).then(() => Npm.list(execOptions));
  }
}

module.exports = Npm;
