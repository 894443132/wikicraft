
define([
	'app',
	'helper/util',
    'helper/markdownwiki',
    'text!html/moduleEditor.html',
    'swiper',
], function(app, util, markdownwiki, htmlContent, swiper){
	var objectEditor = {
		data: {},
		fields:[],
	}

	// 添加输入字段 {id:"html id". key:"key1.key2", type:"text!link|media", value:"字段值", isHide:false}
	objectEditor.addInputField = function(field){
		if (!field.id || !field.type) {
			console.log("object editor addInputField params error!");
			return;
		}
		
		field.key = field.key || field.id;
		field.displayName = field.displayName || field.key;
		self.fields.push(field);	
	}

	app.registerController("moduleEditorController", ['$scope', function($scope){
		var design_list = [];
		var lastSelectObj = undefined;
		// 转换数据格式
		function get_order_list(obj){
			var list = [];
			for (var key in obj) {
				if (typeof(obj[key]) == "object" && obj[key].editable) {
					list.push(obj[key]);
				}
			}

			for (var i = 0; i < list.length; i++) {
				for (var j = i+1; j < list.length; j++) {
					var io = list[i].order || 9999;
					var jo = list[j].order || 9999;
					if (io > jo) {
						var temp = list[j];
						list[j] = list[i];
						list[i] = temp;
					}
				}
			}

			return list;
		}


		// 隐藏事件
		$scope.click_hide = function(data) {
			data.is_hide = !data.is_hide;
		}

		// 点击列表项
		$scope.click_list_item = function(item) {
			$scope.datas_stack.push($scope.datas);
			//console.log(item);
			if (item.is_leaf) {
				$scope.datas = [item];
			} else {
				$scope.datas = item;
			}
		}

		$scope.close = function() {
			var moduleEditorParams = config.shareMap.moduleEditorParams || {};
			$scope.datas = $scope.datas_stack.pop();
			if (!$scope.datas) {
				//$scope.$close();
				$("#moduleEditorContainer").hide();
				moduleEditorParams.is_show = false;
				if (moduleEditorParams.wikiBlock) {
					var modParams = angular.copy(moduleEditorParams.wikiBlock.modParams);
					//console.log(modParams);
					var paramsTemplate = angular.copy(moduleEditorParams.wikiBlock.params_template);
					//console.log(paramsTemplate, modParams);
					modParams = moduleEditorParams.wikiBlock.formatModParams("", paramsTemplate, modParams, true);
					//console.log(modParams);
					moduleEditorParams.wikiBlock.applyModParams(modParams);
					//config.shareMap.moduleEditorParams = undefined;
				}
			}
		}

		$scope.click_apply_design = function(index) {
			var moduleEditorParams = config.shareMap.moduleEditorParams || {};
			var modParams = $scope.styles[index];
			console.log(modParams);
			if (moduleEditorParams.wikiBlock) {
				moduleEditorParams.wikiBlock.applyModParams(modParams);
			}
		}

		function init() {
			var moduleEditorParams = config.shareMap.moduleEditorParams || {};
			config.shareMap.moduleEditorParams = moduleEditorParams;
			//moduleEditorParams.$scope = $scope;
			moduleEditorParams.setEditorObj = function(obj) {
				moduleEditorParams = config.shareMap.moduleEditorParams || {};
				var selectObj = moduleEditorParams.selectObj;
				console.log(selectObj);
				if (selectObj) {
					setTimeout(function(){
						$("#" + selectObj.id).css("background-color", "red");
					});
				}
				$scope.show_type = "editor";

				if (obj.is_leaf) {
					obj = [obj];
				}
                $scope.datas = get_order_list(obj);
                setTimeout(() => {
                    console.log("21432545");
                    var swiper = new Swiper('.swiper-container',{
                        nextButton: '.swiper-button-next',
                        prevButton: '.swiper-button-prev',
                        pagination: '.swiper-pagination',
                        scrollbar: '.swiper-scrollbar',
                        scrollbarHide: false,
                        slidesPerView: 'auto',
                        mousewheelControl: true,
                        spaceBetween: 50,
                    });  
                }, 1000);
			}
			moduleEditorParams.setDesignList = function(list) {
				moduleEditorParams = config.shareMap.moduleEditorParams || {};
				var style_list = moduleEditorParams.wikiBlock.styles || [];
				$scope.show_type = "design";
				$scope.styles = [];
				$scope.design_view_list = [];
				for (var i = 0; i < style_list.length; i++) {
					var modParams = angular.copy(moduleEditorParams.wikiBlock.modParams);
					modParams = angular.merge(modParams, style_list[i]);
					$scope.styles[i] = modParams;
					var md = markdownwiki({html:true, use_template:false});
					var text = '```' + moduleEditorParams.wikiBlock.cmdName + "\n" + config.services.mdconf.jsonToMd(modParams) + "\n```\n";
					var view = md.render(text);
					$scope.design_view_list.push(view);
				}
			}
			$scope.show_type = "editor";
            $scope.datas_stack = [];
		}

		$scope.$watch("$viewContentLoaded", init);
	}]);


	return htmlContent;
})
