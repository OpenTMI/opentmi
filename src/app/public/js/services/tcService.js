'use strict';

angular.module('tmtServices')
  .factory('Testcase', function($resource) {
    return $resource(
	    "/api/v0/testcases/:id", {id: '@_id'},
	    {update: {method: "PUT", isArray: false}}
    );
  })