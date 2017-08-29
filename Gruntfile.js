require('xunit-file');
const fs = require('fs');

function gruntSetup(grunt) {
  const testFilesApi = ['test/tests_api/*.js'];
  const testFilesUnit = [
    'test/tests_unittests/*.js',
    'test/tests_unittests/tools/*.js',
    'test/tests_unittests/tools/**/*.js',
    'test/tests_unittests/addons/*.js',
    'test/tests_unittests/controllers/*.js',
    'test/tests_unittests/routes/*.js'
  ];

  grunt.initConfig({
    express: {
      test: {
        options: {
          delay: 15000,
          script: 'index.js',
          args: ['-s'] // to more traces set -vvv instead of -s (silent)
        }
      }
    },
    waitServer: {
      server: {
        options: {
          timeout: 30000,
          url: 'http://localhost:3000/api/v0'
        }
      }
    },
    exec: {
      restore_db_windows: {
        cmd: 'bash .\\scripts\\dbrestore_windows.sh local .\\test\\seeds\\test_dump\\',
        stdout: false,
        stderr: false
      },
      restore_db_linux: {
        cmd: './scripts/dbrestore_linux.sh local ./test/seeds/test_dump/',
        stdout: false,
        stderr: false,
        options: {
          shell: 'bash'
        }
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
  });

  grunt.registerTask('FindApiTests', 'Find all tests under the addons', () => {
    const root = 'app/addons';
    function walk(path) {
      const items = fs.readdirSync(path);
      items.forEach((item) => {
        const dirName = `${path}/${item}`;
        if (fs.statSync(dirName).isDirectory()) {
          // find only directories that ends with /test
          if (dirName.substr(dirName.length - 5) === '/test') {
            // use only test directories that are in the root of the addon
            if ((dirName.match(/\//g) || []).length === 3) {
              // only add test js files that are in the root of the /test directory.
              // if you need to include subdirs, modify this to: dirName + '/' + '**/*.js'
              testFilesApi.push(`${dirName}/*.js`);
            }
          }
          walk(dirName);
        }
      });
    }
    walk(root);
  });

  grunt.loadNpmTasks('grunt-wait-server');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-simple-mocha');

  grunt.registerTask('default', [
    'FindApiTests',
    'simplemocha:unit',
    'express:test',
    'waitServer',
    'exec:restore_db_linux',
    'simplemocha:api'
  ]);

  grunt.registerTask('apitests', [
    'FindApiTests',
    'express:test',
    'waitServer',
    'exec:restore_db_linux',
    'simplemocha:api'
  ]);

  grunt.registerTask('unittests', ['simplemocha:unit']);
}


module.exports = gruntSetup;
