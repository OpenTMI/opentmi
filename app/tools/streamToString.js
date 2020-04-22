const Promise = require('bluebird');

function streamToString(stream) {
  return new Promise((resolve) => {
    const chunks = [];
    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    stream.on('end', () => {
      resolve(chunks.join(''));
    });
  });
}

module.exports = streamToString;
