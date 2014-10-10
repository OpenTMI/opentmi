'use strict';

angular.module('tmtControllers')
  .controller('tcController', 
             ['$scope', 'Testcase', '$stateParams', '$log', 
    function ($scope,   Testcase,   $stateParams,    $log) {
  
    $log.info('init tcController')
    
    $scope.tags = [];
     /*
    $scope.loadTags = function(query) {
      return tags.query().$promise;
    };*/
    
    $scope.msg = {};
    
    
    $scope.columns = [ 
      { field: 'id', width:300, enableCellEdit: true, pinnedLeft:true }, 
      { field: 'tcid', width:300, enableCellEdit: true }, 
      /*{ field: 'specs', enableCellEdit: true },
      { field: 'duration', width:100, enableCellEdit: true, cellTemplate: '<div class="ui-grid-cell-contents"><span>{{COL_FIELD}}</span></div>' },
      { field: 'owner.user', enableCellEdit: true },*/
    ];
    $scope.gridOptions = { 
      columnDefs: $scope.columns,
      enableColumnResizing: true,
      //enableFiltering: true,
      //exporterMenuCsv: true,
      enableGridMenu: true
    };
    
    $scope.testcaseService = Testcase.query({fl: true, _id: $stateParams.testcaseId});
    $scope.dataTestcases = {};
    $scope.gridOptions.data = 'dataTestcases';
    
    $scope.testcaseService.$promise.then( function(testcases){
      $scope.dataTestcases = testcases;
    });
    
    //$scope.msg.lastCellEdited = 'asd';
    
    
    $scope.gridOptions.onRegisterApi = function(gridApi){
      //set gridApi on scope
      $scope.gridApi = gridApi;
      gridApi.edit.on.afterCellEdit($scope,function(rowEntity, colDef, newValue, oldValue){
        
        //Somewhy this not working property!
        $scope.msg.lastCellEdited = 'edited row id:' + rowEntity._id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue ;
        $scope.$apply();
        
        rowEntity.$update( function( response ) {
          $scope.msg.error = null;
        }, function( error ) {
          $scope.msg.error = error;
        });
        
      });
    }; 
    
  }]);