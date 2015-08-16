require("xunit-file");

module.exports = function (grunt) {
  grunt.initConfig({
    express: {
      test: {
        options: {
          script: "server.js",
          timeout: 3000
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
      all: { src: ["test/app.init.js"] }
    }
  });
  grunt.loadNpmTasks('grunt-wait-server');
  grunt.loadNpmTasks("grunt-express-server");
  grunt.loadNpmTasks("grunt-simple-mocha");
  grunt.registerTask("default", ["express:test", 'waitServer', "simplemocha:all"]);

};
