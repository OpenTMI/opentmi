const Promise = require('bluebird');
const mongoose = require('mongoose');
const {Mockgoose} = require('mockgoose');

mongoose.Promise = Promise;
const mockgoose = new Mockgoose(mongoose);


module.exports = {
  setup: function setup() {
    const options = {useNewUrlParser: true};
    return mockgoose.prepareStorage()
      .then(() => mongoose.connect('mongodb://test', options));
  },
  reset: function () {
    return mockgoose.helper.reset();
  },
  teardown: function teardown() {
    return mockgoose.helper.reset()
      .then(() => mongoose.disconnect())
      .then(() => {
        const retval = new Promise((resolve) => {
          mockgoose.mongodHelper.mongoBin.childProcess.once('exit', resolve);
        }).timeout(2000, 'cannot kill mongoBin process');
        mockgoose.mongodHelper.mongoBin.childProcess.kill('SIGTERM');
        return retval;
      });
  }
};
