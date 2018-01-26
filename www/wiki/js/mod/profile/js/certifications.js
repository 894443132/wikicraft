/*
 * @Author: ZhangKaitlyn 
 * @Date: 2018-01-19
 * @Last Modified by: none
 * @Last Modified time: 2018-01-26 10:30:06
 */
define([
    'app', 
    'text!wikimod/profile/html/certifications.html',
    'text!wikimod/profile/html/modalTemplate/addCertificationsModal.html',
    'helper/mdconf',
], function (app, htmlContent, addCertificationModalHtmlContent, mdconf) {
    function registerController(wikiBlock) {
        app.registerController("certificationCtrl", ['$rootScope', '$scope', '$uibModal', function ($rootScope, $scope, $uibModal) {
            const modCmd = "```@profile/js/certifications";
            var thisInBlockIndex;
            var thisContainerId;
			wikiBlock.init({
				scope:$scope,
				params_template:{
                    certifications:{
                        is_leaf: true,
                        require: false,
                        certifications:[{
                            is_leaf: true,
                            title:"初级计算机资格",
                            link:"http://www.baidu.com",
                            getDate:"2017-11-06"
                        }]
                    }
                }
            });
            
            $scope.certifications = Array.from($scope.params.certifications);

            // 获取当前模块的index和containerId
            var getBlockIndex = function(){
                if (thisInBlockIndex >= 0) {
                    return thisInBlockIndex;
                }
                var blockList = wikiBlock.blockList;
                for(var i = 0; i<blockList.length; i++){
                    var modReg = new RegExp(modCmd);
                    if (modReg.test(blockList[i].content)) {
                        break;
                    }
                }
                thisInBlockIndex = i;
                thisContainerId = blockList[i].blockCache.containerId;
                return i;
            }

            $scope.showCertificationModal = function(){
                $uibModal.open({
                    template: addCertificationModalHtmlContent,
                    controller: "addCertificationModalCtrl",
                    appendTo: $(".user-certification .modal-parent"),
                    scope: $scope,
                    backdrop:'static'
                }).result.then(function(result){
                    $scope.certifications.push(result);
                    var newItemObj = {
                        index: getBlockIndex(),
                        containerId: thisContainerId,
                        content: modCmd + "\n" + mdconf.jsonToMd({
                            "certifications": $scope.certifications
                        }) + "\n```\n"
                    }
                    console.log(newItemObj.content);
                    $rootScope.$broadcast("changeProfileMd", newItemObj);
                }, function(){
                });
            }
        }]);

        app.registerController("addCertificationModalCtrl", ['$scope', '$uibModalInstance',function ($scope, $uibModalInstance) {
            $scope.addingCertification = {};
            $scope.cancel = function(){
                $uibModalInstance.dismiss("cancel");
            }
            var isRequiredEmptyAttr = function(attrNames){
                attrNames = attrNames || [];
                for(var i = 0;i < attrNames.length;i++){
                    if ($scope.addingCertification[attrNames[i].key] && $scope.addingCertification[attrNames[i].key].length > 0) {
                        continue;
                    }else{
                        break;
                    }
                }
                return {
                    'boolResult':(i < attrNames.length),
                    'attr': attrNames[i] && attrNames[i].value
                };
            }

            $scope.submitaddingCertification = function(){
                $scope.errMsg = "";
                var requiredAttrs = [{
                    'key': 'title',
                    'value': '简介'
                },
                {
                    'key': 'getDate',
                    'value': '获得时间'
                }];
                var requiredResult = isRequiredEmptyAttr(requiredAttrs); 
                if (requiredResult.boolResult) {
                    $scope.errMsg = requiredResult.attr + "不可为空";
                    return;
                }
                $uibModalInstance.close($scope.addingCertification);
            }
        }]);
    }

    return {
        render: function (wikiBlock) {
            registerController(wikiBlock);
            return  htmlContent;       // 返回模块标签内容
        }
    }
});