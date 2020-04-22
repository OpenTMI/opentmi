// 3rd party modules
const stream = require('stream');
const {expect} = require('chai');

// app modules
const streamToString = require('../../../app/tools/streamToString');


describe('streamToString', function () {
  it('should concat streamed data correctly', async function () {
    const mockedStream = stream.Readable();
    mockedStream._read = function () { };

    const stringPromise = streamToString(mockedStream);

    // Stream mock data
    mockedStream.emit('data', 'chunk1');
    mockedStream.emit('data', 'chunk2');
    mockedStream.emit('data', 'chunk3');
    mockedStream.emit('end');

    const data = await stringPromise;

    expect(data).to.be.equal('chunk1chunk2chunk3');
  });
});
