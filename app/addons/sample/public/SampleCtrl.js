'use strict'; 

angular
.module('tmtControllers')
.controller('SampleController', 
  function ($scope, $log) {
    $log.debug('Sample ctrl initialized :)');
  }
);