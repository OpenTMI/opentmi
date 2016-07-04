require("xunit-file");

module.exports = function (grunt) {
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
      all: { src: ["test/*.js"] }
    }
  });
  grunt.loadNpmTasks('grunt-wait-server');
  grunt.loadNpmTasks("grunt-express-server");
  grunt.loadNpmTasks("grunt-simple-mocha");
  grunt.registerTask("default", ["express:test", 'waitServer', "simplemocha:all"]);

};
