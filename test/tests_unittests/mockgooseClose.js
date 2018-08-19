module.exports = (mockgoose, mongoose) =>
  mockgoose.helper.reset()
    .then(() => mongoose.disconnect())
    .then(() => mockgoose.mongodHelper.mongoBin.childProcess.kill('SIGTERM'));
