define([
		'app',
		'helper/util',
		'text!wikimod/wiki/html/toc.html',
], function(app, util, htmlContent){
	// 使用闭包使模块重复独立使用
	function registerController(wikiblock) {
		// 比赛类活动奖励控制器
		app.registerController("tocController", ['$scope', function ($scope) {
			$scope.imgsPath = config.wikiModPath + 'wiki/assets/imgs/';
			$scope.containerId = wikiblock.containerId + "_toc";

			var modParams = angular.copy(wikiblock.modParams || {});
			var pageinfo = config.services.$rootScope.pageinfo;
			
			var startLevel = modParams.startLevel || 1;
			var endLevel = modParams.endLevel || 6;
			var startLine = modParams.startLine || 0;
			var endLine = modParams.endLine || 10000000;


			function addTocItem(tocList, block) {
				var tag = block.tag;
				var text = block.content.replace(/[\s#]/g,'');
				var hn = parseInt(tag[1]);
				var containerId = block.blockCache.containerId;
				
				//console.log(tag, text, hn);
				if (hn < startLevel || hn > endLevel) {
					return;
				}

				tocList = tocList || [];
				var childs = tocList;
				for (var i = startLevel; i < hn; i++) {
					if (!childs || childs.length == 0) {
						childs.push({
							tag:'h' + i,
							text:"", 
							childs:[],
						});
					}
					childs = childs[childs.length-1].childs;
				}

				childs.push({
					tag:tag,
					text:text,
					containerId:containerId,
					childs:[],
				});

				return tocList;
			}

			function generateToc(){
				var blockList = [];
				var tocList = [];

				if (config.shareMap["mdwiki"] && config.shareMap["mdwiki"]["blockList"]) {
					blockList = config.shareMap["mdwiki"]["blockList"];
				}
				for (var i = 0; i < blockList.length; i++) {
					var block = blockList[i];

					if (block.textPosition.from < startLine || block.textPosition.from > endLine) {
						continue;
					}

					if (block.tag[0] != "h" && block.tag[0] != "H") {
						continue;
					}
					
					addTocItem(tocList, block);
				}
				//console.log(tocList);

				return tocList;
			}

			function init() {
				setTimeout(function () {
                    var tocList = generateToc();
                    console.log(tocList);
                    $scope.tocList = tocList;
                });
				//console.log($("#" + $scope.containerId));
				//setInterval(generateToc, 60000);
			}

			$scope.$watch("$viewContentLoaded", init);
		}]);
	}

	return {
		render: function (wikiblock) {
			registerController(wikiblock);
			return htmlContent;
		}
	}
});
