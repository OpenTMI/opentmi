'use strict';	

angular.module('tmtControllers')
  .controller('slideCtrl', function ($scope) {
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
    
    /*for (var i=0; i<4; i++) {
      var newWidth = 600 + i;
      var url = 'http://placekitten.com/' + newWidth + '/300';
      var text = ['More','Extra','Lots of','Surplus'][slides.length % 4] + ' ' +
          ['Cats', 'Kittys', 'Felines', 'Cutes'][slides.length % 4];
      $scope.addSlide(url, text);
    }*/
  });