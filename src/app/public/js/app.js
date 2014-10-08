'use strict';	

// create the module and name it scotchApp
var tmtApp = angular.module('tmtApp', [
  'ui.bootstrap', 'ngRoute',
  'tmtControllers', 'tmtServices' ]);

// configure our routes
tmtApp.config(function($routeProvider) {
  $routeProvider

    // route for the home page
    .when('/', {
      templateUrl : 'pages/home.html',
      controller  : 'mainController'
    })
    
    // route for the tc page
    .when('/testcases', {
      templateUrl : 'pages/testcases.html',
      controller  : 'TcCtrl'
    })

    // route for the about page
    .when('/configure', {
      templateUrl : 'pages/configure.html',
      controller  : 'configController'
    })
    
    // route for the about page
    .when('/about', {
      templateUrl : 'pages/about.html',
      controller  : 'aboutController'
    })

    // route for the contact page
    .when('/contact', {
      templateUrl : 'pages/contact.html',
      controller  : 'contactController'
    })
    
    .otherwise({redirectTo: '/'})
});