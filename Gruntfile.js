require("xunit-file");
fs = require('fs');

var testFiles = ["test/*.js"];
module.exports = function(grunt) {
    grunt.initConfig({
        express: {
            test: {
                options: {
                    script: "index.js",
                    timeout: 3000,
                    harmony: true,
                    args: ['-s'] //to more traces set -vvv instead of -s (silent)
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
        simplemocha: {
            options: {
                globals: ["should"],
                timeout: 3000,
                ignoreLeaks: false,
                ui: "bdd",
                reporter: "xunit-file"
            },
            all: {
                src: testFiles
            }
        }
    });

    grunt.registerTask('FindTests', 'Find all tests under the addons', function() {
        var root = "app/addons";
        (function walk(path) {
            var items = fs.readdirSync(path);
            items.forEach(function(item) {
                if (fs.statSync(path + '/' + item).isDirectory()) {
                    var dirName = path + '/' + item;
                    if (dirName.indexOf('test') > -1) {
                        if ((dirName.match(/\//g) || []).length === 3) {
                            testFiles.push(dirName + '/' + '*.js');
                        }
                    }
                    walk(path + '/' + item);
                }
            });
        })(root);
    });

    grunt.loadNpmTasks('grunt-wait-server');
    grunt.loadNpmTasks("grunt-express-server");
    grunt.loadNpmTasks("grunt-simple-mocha");
    grunt.registerTask("default", ["FindTests", "express:test", 'waitServer', "simplemocha:all"]);

};
