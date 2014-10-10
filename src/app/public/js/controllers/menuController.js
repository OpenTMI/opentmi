'use strict';	

angular.module('tmtControllers')
  .controller("menuCtrl",function($scope, $http) {
    //http://quarktheme.com/typography-icons/
    $scope.menus = [
    {
      title: "Test Management", tooltip: 'test',  
      action: "#", icon: 'cogs',
      menus: [
        {  title: "Testcases", tooltip: 'test', action: "#/testcases" },
        {  title: "Campaigns", tooltip: '', action: "#/campaigns" },
        {  title: "Plans", tooltip: '', action: "#/plans" },
        {  title: "Automation", tooltip: '', action: "#/automation" },
        /*{
          title: "Submenu 1b",
          action: "moreStuff",
          menus: [
            {
              title: "Submenu 1b 1",
              action: "stuff"
            },
            {
              title: "Submenu 1b 2",
              action: "moreStuff"
            }
          ]
        }*/
      ]
    },
    {
      title: "DUT", tooltip: 'Device Under Test',
      action: "", 
      menus: [
        { title: "Devices", action: "#/resources?type=dut" },
        { title: "Specifications", action: "#/dut-specifications" },
        { title: "Features", action: "#/dut-features" },
      ]
    },
    {
      title: "Resources", tooltip: 'Test rets',
      action: "", 
      menus: [
        { title: "List of Resources", action: "#/resources" },
        { title: "Specifications", action: "#/specifications" },
        { title: "Features", action: "#/features" }
      ]
    },
    {
      title: "Builds", tooltip: 'Build informations',
      action: "#",
      menus: [
        { title: "Builds", action: "#/builds" },
        { title: "Tree", action: "#/builds-tree" }
      ]
    },
    {
      title: "Results", tooltip: 'Test Results',
      action: "#",
      menus: [
        { title: "Results", action: "#/results" },
        { title: "Analyse", action: "#/results-analyse" }
      ]
    },
    {
      title: "Reports", tooltip: 'Test Reports',
      action: "#",
      menus: [
        { title: "Reports", action: "#/reports?news" },
        { title: "Templates", action: "#/reports-templates" }
      ]
    }
    ];
    
    $scope.cmenu = {
      title: "", tooltip: 'test',  
      action: "", icon: 'cogs',
      menus: [
        {  title: "Accounts", tooltip: 'test', action: "#/accounts" },
        {  title: "Groups", action: "#/groups" },
        {  title: "Settings", action: "#/settings" },
        {  title: "Addons", action: "#/addons" },
      ]
    }
    
  })
  .controller('mainController', function($scope, $http) {
    // create a message to display in our view
    $scope.message = 'General Purpose Test Management and automation framework';
  })
  .controller('configController', function($scope) {
    $scope.message = 'There will be app configurations';
  })
  .controller('aboutController', function($scope) {
    $scope.message = 'Look! I am an about page.';
  })

  .controller('contactController', function($scope) {
    $scope.message = 'Jussi Vatjus-Anttila';
  });
 