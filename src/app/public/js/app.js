'use strict';	

// create the module and name it scotchApp
angular.module('tmtApp', [
  'ui.bootstrap', 'ui.router', 'ngTagsInput', 'ngAnimate',
  'tmtControllers', 'tmtServices' ])

.run(
  [          '$rootScope', '$state', '$stateParams',
    function ($rootScope,   $state,   $stateParams) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
    }
  ]
)
// configure our routes
.config(['$stateProvider', '$urlRouterProvider', 
  function($stateProvider, $urlRouterProvider) {

      
    // Redirects and Otherwise //

    // Use $urlRouterProvider to configure any redirects (when) and invalid urls (otherwise).
    $urlRouterProvider

      // The `when` method says if the url is ever the 1st param, then redirect to the 2nd param
      // Here we are just setting up some convenience urls.
      .when('/tc?id', '/testcases/:id')
      .when('/testcases/:id', '/testcases/:id')

      // If the url is ever invalid, e.g. '/asdf', then redirect to '/' aka the home state
      .otherwise('/');
    
    
    // route for the home page
    $stateProvider
      
      
    
      .state('home', {
        url: '/',
        templateUrl: 'pages/home.html',
        controller: 'homeController'
      })
      
      
      .state('testcase', {
        url: '/testcases',
        controller: 'tcController',
        views: {
            '': { templateUrl: 'pages/testcases.html' },
            'tcFilters@testcase': { 
              templateUrl: 'pages/testcases.filters.html',
            },
            'tcBody@testcase': { 
              templateUrl: 'pages/testcases.body.html'
            },
            'tcStatus@testcase': { 
              templateUrl: 'pages/testcases.status.html'
            }
        }
      })
      .state('campaigns', {
        url: '/campaigns',
        templateUrl: 'pages/campaigns.html',
        //controller: 'campaignsController'
      })
      
      .state('resources', {
        url: '/resources',
        templateUrl: 'pages/resources.html',
        //controller: 'resourcesController'
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