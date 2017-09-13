// native modules
const {spawn} = require('child_process');
const readline = require('readline');
// 3rd party modules
const Promise = require('bluebird');
// application modules
const logger = require('./logger');

function zdiff(file1, file2, options = [
  // '-n',
  '--suppress-common-lines',
  '--ignore-all-space',
  '--side-by-side'
]) {
  return new Promise((resolve, reject) => {
    const args = [
      ...options,
      `<(gzip -dc ${file1})`,
      `<(gzip -dc ${file2})`
    ];
    logger.silly(`diff ${args.join(' ')}`);
    const grep = spawn('diff', args, {shell: '/bin/bash'});
    const differs = [];
    const rl = readline.createInterface({
      input: grep.stdout
    });
    rl.on('line', line => differs.push(line));
    grep.stderr.on('data', (data) => {
      logger.warn(`zgrep:stderr: ${data}`);
    });
    grep.on('close', (code) => {
      if (code === 0) {
        resolve({file1, file2, code});
      } else if (code === 1) {
        resolve({differs: differs.splice(0, 20), file1, file2, code});
      } else {
        reject(new Error(`diff failed with code: ${code}`));
      }
    });
  });
}

module.exports = zdiff;

if (require.main === module) {
  // simple test
  zdiff('../../data/1.gz', '../../data/2.gz')
    .then(console.log)
    .catch(console.error);
}
