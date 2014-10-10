'use strict';	

angular.module('tmtControllers')
  .controller('homeController', function ($scope) {
    $scope.myInterval = 5000;
    var slides = $scope.slides = [];
    
    $scope.addSlide = function(url, text) {
      slides.push({
        image: url, text: text
      });
    };
    
    $scope.addSlide('#', 'Current status');
    $scope.addSlide('#', 'Active execution');
    $scope.addSlide('#', 'This week');
    $scope.addSlide('#', 'This month');
  });