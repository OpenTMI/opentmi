// Native components
const fs = require('fs');
const path = require('path');

// Third party components
require('xunit-file');

// Grunt variables
const dbPath = path.join('.', 'scripts', 'dbrestore.sh');
const dumpPath = path.join('.', 'test', 'seeds', 'test_dump');

const testFilesApi = ['test/tests_api/*.js'];
const testFilesUnit = [
  'test/tests_unittests/*.js',
  'test/tests_unittests/tools/*.js',
  'test/tests_unittests/tools/**/*.js',
  'test/tests_unittests/addons/*.js',
  'test/tests_unittests/controllers/*.js',
  'test/tests_unittests/routes/*.js'
];

const gruntConfig = {
  express: {
    test: {
      options: {
        delay: 15000,
        script: 'index.js',
        node_env: 'test',
        args: ['-vvv'] // to more traces set -vvv instead of -s (silent)
      }
    }
  },
  waitServer: {
    server: {
      options: {
        timeout: 120000,
        url: 'http://localhost:3000/api/v0'
      }
    }
  },
  exec: {
    restore_db: {
      cmd: `bash ${dbPath} local ${dumpPath}`,
      stdout: false,
      stderr: false
    }
  },
  simplemocha: {
    options: {
      globals: ['should', 'check'],
      timeout: 120000,
      ignoreLeaks: false
    },
    api: {
      src: testFilesApi
    },
    unit: {
      src: testFilesUnit
    }
  }
};

function listAddons() {
  const root = 'app/addons';

  return fs.readdirSync(root)
    .map(item => path.join(root, item)) // Map items to actual paths to those items
    .filter(itemPath => fs.statSync(itemPath).isDirectory()); // Filter only directories
}

function findAddonUnitTests() {
  listAddons().forEach((addonPath) => {
    // Read addon items
    fs.readdirSync(addonPath)
      .filter(item => item === 'unitTests') // Filter only items that are named unitTests
      .map(item => path.join(addonPath, item)) // Map items to actual paths to those items
      .filter(itemPath => fs.statSync(itemPath).isDirectory()) // filter only those paths that are directories
      .forEach((testPath) => {
        testFilesUnit.push(path.join(testPath, '*.js'));
      });
  });
}

function findAddonApiTests() {
  listAddons().forEach((addonPath) => {
    // Read addon items
    fs.readdirSync(addonPath)
      .filter(item => item === 'apiTests') // Filter only items that are named apiTests
      .map(item => path.join(addonPath, item)) // Map items to actual paths to those items
      .filter(itemPath => fs.statSync(itemPath).isDirectory()) // filter only those paths that are directories
      .forEach((testPath) => {
        testFilesApi.push(path.join(testPath, '*.js'));
      });
  });
}

function gruntSetup(grunt) {
  grunt.initConfig(gruntConfig);

  grunt.loadNpmTasks('grunt-wait-server');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-simple-mocha');

  grunt.registerTask('findAddonUnitTests', findAddonUnitTests);
  grunt.registerTask('findAddonApiTests', findAddonApiTests);

  grunt.registerTask('unittests', [
    'findAddonUnitTests',
    'simplemocha:unit'
  ]);
  grunt.registerTask('apitests', [
    'findAddonApiTests',
    'exec:restore_db',
    'express:test',
    'waitServer',
    'simplemocha:api'
  ]);
  grunt.registerTask('default', [
    'unittests',
    'apitests'
  ]);
}


module.exports = gruntSetup;
