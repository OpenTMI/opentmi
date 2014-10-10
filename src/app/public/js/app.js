'use strict';	

// create the module and name it scotchApp
var tmtApp = angular.module('tmtApp', [
  'ui.bootstrap', 'ui.router',
  'tmtControllers', 'tmtServices' ]);

// configure our routes
tmtApp.config(['$stateProvider', '$urlRouterProvider', 
  function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/');
    
    // route for the home page
    $stateProvider
      .state('main', {
        url: '/',
        templateUrl: 'pages/home.html',
        controller: 'mainController'
      })
      
      .state('testcase', {
        url: '/testcases',
        templateUrl: 'pages/testcases.html',
        controller: 'TcCtrl'
      })

      .state('about', {
        url: '/about',
        templateUrl: 'pages/about.html',
        controller: 'aboutController'
      })
      .state('settings', {
        url: '/settings',
        templateUrl: 'pages/configure.html',
        controller: 'configController'
      })
      .state('contact', {
        url: '/contact',
        templateUrl: 'pages/contact.html',
        controller: 'contactController'
      });
}]);