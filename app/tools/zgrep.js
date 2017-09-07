// native modules
const {spawn} = require('child_process');
const readline = require('readline');
// 3rd party modules
const _ = require('lodash');
const Promise = require('bluebird');
// application modules
const logger = require('./logger');

function zgrep(file, pattern, options = ['-n']) {
  return new Promise((resolve, reject) => {
    const args = [file, '-e', pattern, ...options];
    const grep = spawn('zgrep', args);
    const matches = [];
    const rl = readline.createInterface({
      input: grep.stdout
    });
    rl.on('line', line => matches.push(line));
    grep.stderr.on('data', (data) => {
      logger.warn(`zgrep:stderr: ${data}`);
    });
    grep.on('close', (code) => {
      if (code === 0) {
        resolve({matches, pattern, file});
      } else if (code === 1) {
        resolve({pattern, file});
      } else {
        reject(new Error(`zgrep failed with code: ${code}`));
      }
    });
  });
}

const NS_PER_SEC = 1e9;
function duration(promise) {
  const startTime = process.hrtime();
  return promise.then((data) => {
    const endTime = process.hrtime(startTime);
    const time = (endTime[0] * NS_PER_SEC) + endTime[1];
    return Promise.resolve([data, time / NS_PER_SEC]);
  });
}
function zgrepMultiple(files, pattern, options = ['-n', '-i']) {
  const greps = Promise.map(
    files,
    file => zgrep(file, pattern, options),
    {concurrency: 10})
    .filter(data => data.matches);
  return duration(Promise
    .reduce(greps,
      (out, item) => {
        out.matches[item.file] = item.matches;
        return out;
      },
      {matches: {}})
    .then((result) => {
      _.set(result, 'pattern', pattern);
      return result;
    }))
    .then(([data, time]) => {
      _.set(data, 'time', time);
      return data;
    });
}

module.exports = {zgrep, zgrepMultiple};

const files = [
  './data/1.gz',
  './data/2.gz',
  './data/123.gz'];
zgrepMultiple(files, 'stephi')
  .then(console.log)
  .catch(console.error);
