/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Reidar Cederqvist <reidar.cederqvist@gmail.com>

	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/ 

JUCI.app
.factory("utilsAddTestserverPicker", function($modal, $network){
	return {
		show: function(){
			var def = $.Deferred(); 
			var modalInstance = $modal.open({
				animation: true,
				templateUrl: 'widgets/utils-add-testserver-picker.html',
				controller: 'utilsAddTestserverPicker'
			});

			modalInstance.result.then(function (data) {
				setTimeout(function(){ // do this because the callback is called during $apply() cycle
					def.resolve(data); 
				}, 0); 
			}, function () {
					
			});
			return def.promise(); 
		}
	}; 
})
.controller("utilsAddTestserverPicker", function($scope, $modalInstance, $tr, gettext){
	$scope.data = {}; 
	$scope.ok = function () {
		if((!$scope.data.address) || (!$scope.data.port)) {
			alert($tr(gettext("Address and port needed"))); 
			return; 
		}
		$modalInstance.close($scope.data);
	};

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
})
