'use strict';

angular.module('tmtControllers')
  .controller('TcCtrl', ['$scope', 'Testcase', function ($scope, Testcase) {
    
    $scope.msg = {};
    
    /*
    $scope.columns = [ 
      { field: 'name', width:300, enableCellEdit: true, pinnedLeft:true }, 
      { field: 'specs', enableCellEdit: true },
      { field: 'duration', width:100, enableCellEdit: true, cellTemplate: '<div class="ui-grid-cell-contents"><span>{{COL_FIELD}}</span></div>' },
      { field: 'user', enableCellEdit: true },
    ]; */
    $scope.gridOptions = { 
      //columnDefs: $scope.columns,
      enableColumnResizing: true,
      //enableFiltering: true,
      //exporterMenuCsv: true,
      enableGridMenu: true
    };
    
    $scope.testcaseService = Testcase.query(/*{fl: true}*/);
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
        
        /* 
        //Somewhy this not working property!
        $scope.msg.lastCellEdited = 'edited row id:' + rowEntity._id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue ;
        $scope.$apply();
        */
        
        
        rowEntity.$update( function( response ) {
          $scope.msg.error = null;
        }, function( error ) {
          $scope.msg.error = error;
        });
        
      });
    }; 
    
  }]);