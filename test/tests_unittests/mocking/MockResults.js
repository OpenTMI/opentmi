const mongoose = require('mongoose');

const results = [
  {
    __v: 0,
    _id: mongoose.Types.ObjectId(),
    tcid: 'mockTestcaseID',
    job: {
      id: 'jobId'
    },
    campaign: 'fillerCampaign',
    campaignRef: mongoose.Types.ObjectId(),
    cre: {
      time: new Date(Date.now()),
      user: 'Jari',
      userRef: mongoose.Types.ObjectId()
    },
    exec: {
      verdict: 'pass',
      note: 'This is a note',
      duration: 12.4,
      profiling: '',
      env: {
        ref: mongoose.Types.ObjectId(),
        rackId: 'rackID',
        framework: {
          name: 'dummyFramework',
          ver: 'dummyVersion'
        }
      },
      sut: {
        ref: mongoose.Types.ObjectId(),
        buildName: 'mockBuildName',
        buildDate: new Date(Date.now()),
        buildUrl: '',
        buildSha1: 'sha1ChecksumOfBuild',
        gitUrl: '',
        branch: 'branchName',
        commitId: 'commitId',
        tag: [''],
        href: '',
        cut: ['componentUnderTest'],
        fut: ['featureUnderTest']
      },
      dut: {
        ref: mongoose.Types.ObjectId(),
        count: 3,
        type: 'process',
        vendor: 'dutVendor',
        model: 'dutModel',
        ver: 'dutVer',
        sn: 'sn'
      },
      logs: []
    }
  },
  {
    __v: 0,
    _id: mongoose.Types.ObjectId(),
    tcid: 'anotherMockTestcaseID',
    job: {
      id: 'jobId'
    },
    campaign: 'fillerCampaign',
    campaignRef: mongoose.Types.ObjectId(),
    cre: {
      time: new Date(Date.now()),
      user: 'MockName',
      userRef: mongoose.Types.ObjectId()
    },
    exec: {
      verdict: 'fail',
      note: 'Mock note',
      duration: 9.4,
      profiling: '',
      env: {
        ref: mongoose.Types.ObjectId(),
        rackId: 'rackID_A',
        framework: {
          name: 'dummyFramework_A',
          ver: 'dummyVersion_A'
        }
      },
      sut: {
        ref: mongoose.Types.ObjectId(),
        buildName: 'fakeBuildName',
        buildDate: new Date(Date.now()),
        buildUrl: '',
        buildSha1: 'fakeSha1ChecksumOfBuild',
        gitUrl: '',
        branch: 'fakeBranchName',
        commitId: 'fakeCommitId',
        tag: [''],
        href: '',
        cut: ['componentUnderTest'],
        fut: ['featureUnderTest']
      },
      dut: {
        ref: mongoose.Types.ObjectId(),
        count: 3,
        type: 'process',
        vendor: 'dutVendor',
        model: 'dutModel',
        ver: 'dutVer',
        sn: 'sn'
      },
      logs: []
    }
  }
];

module.exports = results;
