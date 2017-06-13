require("xunit-file");
const fs = require('fs');


module.exports = function(grunt) {
    var testFilesApi = ["test/tests_api/*.js"];
    var testFilesUnit = ["test/tests_unittests/*.js"];

    grunt.initConfig({
        express: {
            test: {
                options: {
                    output: "dummy testcases generated",
                    delay: 10000,
                    script: "index.js",
                    timeout: 3000,
                    harmony: true,
                    args: ['-s'], //to more traces set -vvv instead of -s (silent)
                }
            }
        },
        waitServer: {
            server: {
                options: {
                    url: 'http://localhost:3000/api/v0'

                }
            }
        },
        exec: {
            restore_db: {
                cmd: './scripts/dbrestore_linux.sh local ./test/seeds/test_dump/',
                stdout: true,
                stderr: true,
                options: {
                    shell: 'bash',
                }            
            }
        },
        simplemocha: {
            options: {
                globals: ["should"],
                timeout: 120000,
                ignoreLeaks: false,
            },
            api: {
                src: testFilesApi
            },
            unit: {
                src: testFilesUnit
            }
        },
    });

    grunt.registerTask('FindApiTests', 'Find all tests under the addons', function() {
        var root = "app/addons";
        (function walk(path) {
            var items = fs.readdirSync(path);
            items.forEach(function(item) {
                if (fs.statSync(path + '/' + item).isDirectory()) {
                    var dirName = path + '/' + item;
                    // find only directories that ends with /test
                    if (dirName.substr(dirName.length - 5) === "/test") {
                        // use only test directories that are in the root of the addon
                        if ((dirName.match(/\//g) || []).length === 3) {
                            // only add test js files that are in the root of the /test directory.
                            // if you need to include subdirs, modify this to: dirName + '/' + '**/*.js'
                            testFilesApi.push(dirName + '/' + '*.js');
                        }
                    }
                    walk(path + '/' + item);
                }
            });
        })(root);
    });

    grunt.loadNpmTasks('grunt-wait-server');
    grunt.loadNpmTasks("grunt-express-server");
    grunt.loadNpmTasks("grunt-exec");
    grunt.loadNpmTasks("grunt-simple-mocha");
    grunt.registerTask("default", ["simplemocha:unit", "FindApiTests", "express:test", "waitServer", "exec", "simplemocha:api"]);
    grunt.registerTask("apitests", ["FindApiTests", "express:test", "waitServer", "exec", "simplemocha:api"]);
    grunt.registerTask("unittests", ["simplemocha:unit"]);
};
