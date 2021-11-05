// Native components
const fs = require('fs');
const path = require('path');

// Third party components
require('xunit-file');

// Grunt variables
const dbPath = path.join('.', 'scripts', 'dbrestore.sh');
const dumpPath = path.join('.', 'test', 'seeds', 'test_dump');

const testFilesApi = ['test/tests_api/*.js'];

const testFilesCluster = ['test/tests_cluster/*.js', 'test/tests_api/socketio.js'];

const gruntConfig = {
  express: {
    single_server: {
      options: {
        delay: 15000,
        script: 'app/index.js',
        node_env: 'test',
        args: ['--config', 'test/config.auth.json']
      }
    },
    cluster_server: {
      options: {
        delay: 15000,
        script: 'app/cluster.js',
        node_env: 'test',
        args: ['--config', 'test/config.auth.json']
      }
    }
  },
  waitServer: {
    server: {
      options: {
        timeout: 60000,
        url: 'http://localhost:3000/api/v0'
      }
    }
  },
  exec: {
    restore_db: {
      cmd: `bash ${dbPath} local ${dumpPath}`,
      stdout: false
    }
  },
  simplemocha: {
    options: {
      globals: ['should', 'check'],
      reporter: 'json',
      'reporter-option': 'report_api.json',
      timeout: 120000,
      ignoreLeaks: false
    },
    cluster: {
      src: testFilesCluster
    },
    api: {
      src: testFilesApi
    }
  }
};

function listAddons() {
  const root = 'app/addons';

  return fs.readdirSync(root)
    .map(item => path.join(root, item)) // Map items to actual paths to those items
    .filter(itemPath => fs.statSync(itemPath).isDirectory()); // Filter only directories
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

  grunt.registerTask('findAddonApiTests', findAddonApiTests);

  grunt.registerTask('apitests', [
    'findAddonApiTests',
    'exec:restore_db',
    'express:single_server',
    'waitServer',
    'simplemocha:api'
  ]);
  grunt.registerTask('clustertests', [
    'express:cluster_server',
    'waitServer',
    'simplemocha:cluster'
  ]);
  grunt.registerTask('default', [
    'apitests',
    'clustertests'
  ]);
}


module.exports = gruntSetup;
