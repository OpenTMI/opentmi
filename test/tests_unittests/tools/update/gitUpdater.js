/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

// Third party components
const chai = require('chai');

// Application components
const GitUpdater = require('../../../../app/tools/update/gitUpdater');

// Variables
const expect = chai.expect;
let gitUpdater;


describe('update/gitUpdater', function () {
  describe('exports', function () {
    it('should expose a class named GitUpdater', function (done) {
      expect(GitUpdater.name).to.equal('GitUpdater');
      done();
    });
  });

  describe('GitUpdater', function () {
    describe('constructor', function () {
      it('should define right properties with no parameters', function (done) {
        gitUpdater = new GitUpdater(undefined, undefined);

        expect(gitUpdater).to.have.property('exec');
        expect(gitUpdater).to.have.property('npm');

        done();
      });

      it('should define right properties with parameters', function (done) {
        gitUpdater = new GitUpdater(undefined, undefined, 'ExecModule');

        expect(gitUpdater).to.have.property('exec', 'ExecModule');
        expect(gitUpdater).to.have.property('npm');

        done();
      });
    });

    describe('_update', function () {
      it('should call functions in the right order', function () {
        gitUpdater = new GitUpdater(undefined, undefined, () => {
          throw new Error('Nothing should be executed here!');
        });

        let cleanlinessChecked = false;
        gitUpdater._isClean = () => {
          cleanlinessChecked = true;
          return Promise.resolve();
        };

        gitUpdater._reset = () => { throw new Error('Reset should not be called here!'); };

        let cleanCalled = false;
        gitUpdater._clean = () => {
          expect(cleanlinessChecked).to.equal(true, 'Should check for cleanliness before clean');
          cleanCalled = true;
          return Promise.resolve();
        };

        let checkoutCalled = false;
        gitUpdater._checkout = (revision) => {
          expect(cleanCalled).to.equal(true, 'Should check for clean before checkout');
          expect(revision).to.equal('TestRevision');
          checkoutCalled = true;
          return Promise.resolve();
        };

        let installCalled = false;
        gitUpdater.npm.install = function install(options) {
          expect(checkoutCalled).to.equal(true, 'Should checkout before install');
          expect(options).to.have.keys(['cwd', 'env']);
          installCalled = true;
          return Promise.resolve();
        };

        const updatePromise = gitUpdater._update('TestRevision')
          .then(() => {
            expect(cleanlinessChecked).to.equal(true, 'Should check for cleanliness');
            expect(cleanCalled).to.equal(true, 'Should call clean function');
            expect(checkoutCalled).to.equal(true, 'Should call checkout');
            expect(installCalled).to.equal(true, 'Should call install');
            return Promise.resolve();
          });

        return updatePromise;
      });

      it('should call reset if not clean', function () {
        gitUpdater = new GitUpdater(undefined, undefined,
          () => { throw new Error('Nothing should be executed here!'); });

        let cleanlinessChecked = false;
        gitUpdater._isClean = () => {
          cleanlinessChecked = true;
          return Promise.reject('Unclean');
        };

        let resetCalled = false;
        gitUpdater._reset = () => {
          resetCalled = true;
          return Promise.resolve('Reset done');
        };

        let cleanCalled = false;
        gitUpdater._clean = () => {
          expect(cleanlinessChecked).to.equal(true, 'Should check for cleanliness before clean');
          cleanCalled = true;
          return Promise.resolve();
        };

        let checkoutCalled = false;
        gitUpdater._checkout = (revision) => {
          expect(cleanCalled).to.equal(true, 'Should check for clean before checkout');
          expect(revision).to.equal('TestRevision');
          checkoutCalled = true;
          return Promise.resolve();
        };

        let installCalled = false;
        gitUpdater.npm.install = () => {
          expect(checkoutCalled).to.equal(true, 'Should checkout before install');
          installCalled = true;
          return Promise.resolve();
        };

        const updatePromise = gitUpdater._update('TestRevision')
          .then(() => {
            expect(cleanlinessChecked).to.equal(true, 'Should check for cleanliness');
            expect(resetCalled).to.equal(true, 'Reset should be called since we are not clean');
            expect(cleanCalled).to.equal(true, 'Should call clean function');
            expect(checkoutCalled).to.equal(true, 'Should call checkout');
            expect(installCalled).to.equal(true, 'Should call install');
            return Promise.resolve();
          });

        return updatePromise;
      });

      it('should fail if reset fails', function () {
        gitUpdater = new GitUpdater(undefined, undefined);

        gitUpdater._isClean = () => Promise.reject();
        gitUpdater._reset = () => Promise.reject(new Error('Reset failed'));

        return expect(gitUpdater._update()).to.be.rejectedWith(Error, 'Reset failed');
      });

      it('should fail if clean fails', function () {
        gitUpdater = new GitUpdater(undefined, undefined);

        gitUpdater._isClean = () => Promise.resolve();
        gitUpdater._clean = () => Promise.reject(new Error('Clean failed'));

        return expect(gitUpdater._update()).to.be.rejectedWith(Error, 'Clean failed');
      });

      it('should fail if _checkout fails', function () {
        gitUpdater = new GitUpdater(undefined, undefined);

        gitUpdater._isClean = () => Promise.resolve();
        gitUpdater._clean = () => Promise.resolve();
        gitUpdater._checkout = () => Promise.reject(new Error('Checkout failed'));

        return expect(gitUpdater._update()).to.be.rejectedWith(Error, 'Checkout failed');
      });

      it('should fail if install fails', function () {
        gitUpdater = new GitUpdater(undefined, undefined);

        gitUpdater._isClean = () => Promise.resolve();
        gitUpdater._clean = () => Promise.resolve();
        gitUpdater._checkout = () => Promise.resolve();
        gitUpdater.npm.install = () => Promise.reject(new Error('Install failed'));

        return expect(gitUpdater._update()).to.be.rejectedWith(Error, 'Install failed');
      });
    });

    describe('version', function () {
      let originalSuperVersion;
      before(function () {
        originalSuperVersion = Object.getPrototypeOf(Object.getPrototypeOf(gitUpdater)).version;
      });

      after(function () {
        Object.getPrototypeOf(Object.getPrototypeOf(gitUpdater)).version = originalSuperVersion;
      });

      it('should fetch git version and combine it with super.version', function () {
        gitUpdater = new GitUpdater(undefined, undefined);

        gitUpdater._commitId = () => Promise.resolve('COMMIT_ID');

        gitUpdater._tag = (commitId) => {
          expect(commitId).to.equal('COMMIT_ID');
          return Promise.resolve({tag: 'TAG'});
        };

        Object.getPrototypeOf(Object.getPrototypeOf(gitUpdater)).version = () =>
          Promise.resolve({superVersion: 'SUPER_VERSION'});

        return expect(gitUpdater.version()).to.eventually.deep.equal({
          commitID: 'COMMIT_ID',
          tag: 'TAG',
          superVersion: 'SUPER_VERSION'
        });
      });
    });

    describe('_isClean', function () {
      it('should call exec with correct command', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git diff --quiet HEAD');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.resolve('CleanResolved');
        };

        gitUpdater = new GitUpdater(undefined, undefined, exec);

        return expect(gitUpdater._isClean()).to.eventually.equal('CleanResolved');
      });

      it('should throw error if exec fails', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git diff --quiet HEAD');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.reject(new Error('CleanFailed'));
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._isClean()).to.be.rejectedWith(Error, 'workspace is not clean');
      });
    });

    describe('_tag', function () {
      it('should call exec with correct command', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git describe --exact-match --tags COMMIT_ID');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.resolve('TagResolved');
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._tag('COMMIT_ID')).to.eventually.deep.equal({tag: 'TagResolved'});
      });

      it('should return undefined tag when exec fails', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git describe --exact-match --tags COMMIT_ID');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.reject(new Error('TagFailed'));
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._tag('COMMIT_ID')).to.eventually.deep.equal({tag: undefined});
      });
    });

    describe('_commitId', function () {
      it('should call exec with correct command', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git rev-parse --verify HEAD');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.resolve('CommitIdResolved');
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._commitId()).to.equal('CommitIdResolved');
      });

      it('should throw error when exec fails', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git rev-parse --verify HEAD');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.reject(new Error('CommitIdFailed'));
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._commitId()).to.be.rejectedWith(Error, 'CommitIdFailed');
      });
    });

    describe('_reset', function () {
      it('should call exec with correct command and default options', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git reset --hard');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.resolve('CommitIdResolved');
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._reset()).to.eventually.equal('CommitIdResolved');
      });

      it('should call exec with correct command and custom options', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git reset OPTIONS');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.resolve('CommitIdResolved');
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._reset('OPTIONS')).to.eventually.equal('CommitIdResolved');
      });

      it('should throw error when exec fails', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git reset --hard');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.reject(new Error('CommitIdFailed'));
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._reset()).to.be.rejectedWith(Error, 'CommitIdFailed');
      });
    });

    describe('_fetch', function () {
      it('should call exec with correct command', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git -c core.askpass=true _fetch --all --tags --prune');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.resolve('FetchResolved');
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._fetch()).to.eventually.equal('FetchResolved');
      });

      it('should throw error when exec fails', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git -c core.askpass=true _fetch --all --tags --prune');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.reject(new Error('FetchFailed'));
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._fetch()).to.be.rejectedWith(Error, 'FetchFailed');
      });
    });

    describe('_clean', function () {
      it('should call exec with correct command', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git clean -f -d');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.resolve('CleanResolved');
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._clean()).to.eventually.equal('CleanResolved');
      });

      it('should throw error when exec fails', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git clean -f -d');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.reject(new Error('CleanFailed'));
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._clean()).to.be.rejectedWith(Error, 'CleanFailed');
      });
    });

    describe('_checkout', function () {
      it('should call exec with correct command', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git checkout REVISION');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.resolve('CheckoutResolved');
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._checkout('REVISION')).to.eventually.equal('CheckoutResolved');
      });

      it('should throw error when exec fails', function () {
        const exec = (cmd, options) => {
          expect(cmd).to.equal('git checkout REVISION');
          expect(options).to.have.keys(['cwd', 'env']);
          return Promise.reject(new Error('CheckoutFailed'));
        };

        gitUpdater = new GitUpdater('.', '', exec);

        return expect(gitUpdater._checkout('REVISION')).to.be.rejectedWith(Error, 'CheckoutFailed');
      });
    });
  });
});
