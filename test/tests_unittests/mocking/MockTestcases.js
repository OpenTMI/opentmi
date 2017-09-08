const mongoose = require('mongoose');

const testcases = [
  {
    __v: 0,
    _id: mongoose.Types.ObjectId().toString(),
    tcid: 'mockTestcaseID',
    archive: {
      value: false,
      time: new Date(1501228956735),
      user: 'Kari'
    },
    cre: {
      time: new Date(1501228968862),
      user: 'Kari'
    },
    mod: {
      timestamp: new Date(1501228966862),
      user: 'Kari'
    },
    owner: {
      name: 'Kari',
      group: 'GroupOfKari',
      site: 'KariSite'
    },
    other_info: {
      title: '',
      type: 'alpha',
      purpose: 'to validate code',
      sut: [],
      description: 'this test validates that code functions as intended',
      layer: 'L1',
      components: [
        'component1',
        'component2'
      ],
      features: [
        'feature1',
        'feature2'
      ],
      keywords: [
        'keyword1',
        'keyword2'
      ],
      tags: [{
        _id: mongoose.Types.ObjectId(),
        key: 'tagKey',
        value: 'tagValue'
      }],
      comments: [{
        _id: mongoose.Types.ObjectId(),
        comment: '*constructive feedback regarding why this test has no conceivable purpose*',
        timestamp: new Date(1501228965862)
      }]
    },
    execution: {
      skip: {
        value: false,
        reason: '',
        time: new Date(1501228961862)
      },
      estimation: {
        duration: 1,
        passrate: 2
      }
    },
    requirements: {
      node: {
        count: 4
      }
    },
    files: [],
    specification: {
      inline: '',
      href: ''
    },
    status: {
      value: 'released',
      verification: {
        value: false
      }
    },
    history: {
      durationAvg: 126
    },
    compatible: {
      simulation: {
        yes: true
      },
      hardware: {
        target: [],
        yes: true
      },
      automation: {
        yes: false
      },
      field: {
        yes: false
      }
    },
    ver: {
      cur: 1
    }
  },
  {
    __v: 0,
    _id: mongoose.Types.ObjectId().toString(),
    tcid: 'anotherMockTestcaseID',
    archive: {
      value: false,
      time: new Date(1501228956735),
      user: 'FakeName'
    },
    cre: {
      time: new Date(1501228968862),
      user: 'FakeName'
    },
    mod: {
      timestamp: new Date(1501228966862),
      user: 'FakeName'
    },
    owner: {
      name: 'FakeName',
      group: 'GroupOfFakeName',
      site: 'FakeNameSite'
    },
    other_info: {
      title: '',
      type: 'smoke',
      purpose: 'to validate more code',
      sut: [],
      description: 'this is a smoke test',
      layer: 'L2',
      components: [
        'componentA',
        'componentB'
      ],
      features: [
        'featureA',
        'featureB'
      ],
      keywords: [
        'keywordA',
        'keywordB'
      ],
      tags: [{
        _id: mongoose.Types.ObjectId(),
        key: 'tagKey',
        value: 'tagValue'
      }],
      comments: [{
        _id: mongoose.Types.ObjectId(),
        comment: '*mock comment*',
        timestamp: new Date(1501228965862)
      }]
    },
    execution: {
      skip: {
        value: false,
        reason: '',
        time: new Date(1501228961862)
      },
      estimation: {
        duration: 5,
        passrate: 0
      }
    },
    requirements: {
      node: {
        count: 2
      }
    },
    files: [],
    specification: {
      inline: '',
      href: ''
    },
    status: {
      value: 'released',
      verification: {
        value: false
      }
    },
    history: {
      durationAvg: 35
    },
    compatible: {
      simulation: {
        yes: false
      },
      hardware: {
        target: [],
        yes: true
      },
      automation: {
        yes: false
      },
      field: {
        yes: false
      }
    },
    ver: {
      cur: 2
    }
  }
];


module.exports = testcases;
