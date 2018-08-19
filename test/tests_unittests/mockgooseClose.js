module.exports = (mockgoose, mongoose) =>
  mockgoose.helper.reset()
    .then(() => mongoose.disconnect())
    .then(() => {
        const retval = new Promise((resolve) => {
            mockgoose.mongodHelper.mongoBin.childProcess.on('exit', resolve);
        });
        mockgoose.mongodHelper.mongoBin.childProcess.kill('SIGTERM');
        return retval;
    });
