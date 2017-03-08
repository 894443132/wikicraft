/**
 * Created by wuxiangan on 2016/12/21.
 */

define([
    'app',
    'helper/util',
    'helper/storage',
    'text!html/newWebsite.html',
], function (app, util, storage, htmlContent) {
    var controller = ['$scope', '$state', '$sce', 'Account', function ($scope, $state, $sce, Account) {
        $scope.website = {};
        $scope.websiteNameErrMsg = "";
        $scope.websiteDomainErrMsg = "";
        $scope.errMsg = "";
        $scope.tags = $scope.website.tags ? $scope.website.tags.split('|') : [];
        $scope.commonTags = ['旅游', '摄影', 'IT', '游戏', '生活'];
        $scope.categories = [];//[{name:'个人网站'},{name:'作品网站'},{name:'组织网站'}];
        $scope.subCategories = [];
        $scope.step = 1;
        $scope.nextStepDisabled = !$scope.website.name;
        $scope.isPreview = true;
        config.templateObject = {executeTemplateScript: false};

        function init() {
            var stepLenth = 6;//步骤总数，不包括最后finish状态
            var preBtn = $("#pre");//上一步按钮
            var nextBtn = $("#next");//下一步按钮
            var creatBtn = $("#confirm");
            var finishBtn = $("#finishBtn");//完成按钮

            //初始化当前步骤以及按钮状态
            var nowStep = $(".step-content>div:not(.sr-only)");
            var nowStepId = nowStep[0].id;//当前步骤的id
            btnState(nowStepId);

            function btnState(nowStepId) {
                if (nowStepId === "step1") {//第一步隐藏 上一步、完成、确认创建 按钮
                    preBtn.addClass("sr-only");
                    finishBtn.addClass("sr-only");
                    creatBtn.addClass("sr-only");
                    nextBtn.removeClass("sr-only");
                } else if (nowStepId === "finish") {//完成步骤时隐藏 上一步、下一步、确认创建 按钮
                    preBtn.addClass("sr-only");
                    nextBtn.addClass("sr-only");
                    creatBtn.addClass("sr-only");
                    finishBtn.removeClass("sr-only");
                } else if (nowStepId === ("step" + stepLenth)) {//信息确认时隐藏 下一步、完成按钮 显示 上一步、确认创建按钮
                    preBtn.removeClass("sr-only");
                    creatBtn.removeClass("sr-only");
                    finishBtn.addClass("sr-only");
                    nextBtn.addClass("sr-only");
                } else {//中间步骤隐藏 完成、确认创建 按钮，显示上一步、下一步按钮
                    preBtn.removeClass("sr-only");
                    nextBtn.removeClass("sr-only");
                    finishBtn.addClass("sr-only");
                    creatBtn.addClass("sr-only");
                }
            }

            // 上一步
            preBtn.on("click", function () {
                var nowNum = parseInt(nowStepId.substring(4));//当前步骤类名后的数字 step2 取2
                var preStep = $("#step" + (nowNum - 1));
                preStep.removeClass("sr-only");
                nowStep.addClass("sr-only");
                nowStep = preStep;
                nowStepId = "step" + (nowNum - 1);
                btnState(nowStepId);
            });

            // 下一步
            nextBtn.on("click", function () {
                var nowNum = parseInt(nowStepId.substring(4));//当前步骤类名后的数字 step2 取2
                var nextStep = $("#step" + (nowNum + 1));
                nextStep.removeClass("sr-only");
                nowStep.addClass("sr-only");
                nowStep = nextStep;
                nowStepId = "step" + (nowNum + 1);
                btnState(nowStepId);
            });

            //确认创建
            creatBtn.on("click", function () {
                var nextStep = $("#finish");
                nextStep.removeClass("sr-only");
                nowStep.addClass("sr-only");
                nowStepId = "finish";
                btnState(nowStepId);
            });

            //util.http('POST', config.apiUrlPrefix+'website_category',{}, function (data) {
            util.http('POST', config.apiUrlPrefix + 'website_template_config', {}, function (data) {
                $scope.categories = data;
                for (var i = 0; $scope.categories && i < $scope.categories.length; i++) {
                    var cateory = $scope.categories[i];
                    for (var j = 0; j < cateory.templates.length; j++) {
                        var template = cateory.templates[j];
                        template.content = $sce.trustAsHtml(template.content);
                        for (var k = 0; k < template.styles.length; k++) {
                            var style = template.styles[k];
                            style.content = $sce.trustAsHtml(style.content);
                        }
                    }
                    if ($scope.website.categoryId == $scope.categories[i]._id) {
                        $scope.templates = $scope.categories[i].templates;
                    }
                }

                for (var i = 0; $scope.templates && i < $scope.templates.length; i++) {
                    if ($scope.website.templateId == $scope.templates[i]._id) {
                        $scope.styles = $scope.templates[i].styles;
                        break;
                    }
                }

                $scope.templates = $scope.categories[0].templates;
                $scope.styles = $scope.templates[0].styles;
                $scope.website.categoryId = $scope.categories[0]._id;
                $scope.website.categoryName = $scope.categories[0].name;
                $scope.website.templateId = $scope.templates[0]._id;
                $scope.website.templateName = $scope.templates[0].name;
                $scope.website.styleId = $scope.styles[0]._id;
                $scope.website.styleName = $scope.styles[0].name;
            });
        }

        // 文档加载完成
        $scope.$watch('$viewContentLoaded', init);

        function createWebsiteRequest() {
            $scope.website.userId = Account.getUser()._id;
            $scope.website.username = Account.getUser().username;

            var url = config.apiUrlPrefix + "website";
            console.log($scope.website);

            if (!$scope.editWebsite) {
                url += '/new';
            }
            util.http('PUT', url, $scope.website, function (data) {
                $scope.step++;
            });
        }

        $scope.selectCategory = function (category) {
            $scope.templates = category.templates;
            $scope.styles = category.templates[0].styles;
            $scope.website.categoryId = category._id;
            $scope.website.categoryName = category.name;
            $scope.website.templateId = $scope.templates[0]._id;
            $scope.website.templateName = $scope.templates[0].name;
            $scope.website.styleId = $scope.styles[0]._id;
            $scope.website.styleName = $scope.styles[0].name;
            $scope.nextStepDisabled = false;
        }

        $scope.selectTemplate = function (template) {
            $scope.styles = template.styles;
            $scope.website.templateId = template._id;
            $scope.website.templateName = template.name;
            $scope.website.styleId = $scope.styles[0]._id;
            $scope.website.styleName = $scope.styles[0].name;
            $scope.nextStepDisabled = false;
        }

        $scope.selectStyle = function (style) {
            $scope.website.styleId = style._id;
            $scope.website.styleName = style.name;
            $scope.nextStepDisabled = false;
        }

        $scope.addTag = function (tagName) {
            tagName = util.stringTrim(tagName);
            if (!tagName || $scope.tags.indexOf(tagName) >= 0) {
                return;
            }
            $scope.tags.push(tagName);
            $scope.website.tags = $scope.tags.join('|');
        }

        $scope.removeTag = function (tagName) {
            var index = $scope.tags.indexOf(tagName);
            if (index >= 0) {
                $scope.tags.splice(index, 1);
            }
            $scope.website.tags = $scope.tags.join('|');
        }

        $scope.checkWebsiteName = function () {
            if (!$scope.website.name || $scope.website.name.replace(/(^\s*)|(\s*$)/g, "") == "") {
                $scope.nextStepDisabled = $scope.websiteDomainErrMsg;
                $scope.websiteNameErrMsg = "";
                return;
            }

            $scope.website.name = $scope.website.name.replace(/(^\s*)|(\s*$)/g, "");

            util.http('POST', config.apiUrlPrefix + 'website/isExist', {
                username: $scope.user.username,
                sitename: $scope.website.name
            }, function (data) {
                if (data && $scope.website._id != data._id) {
                    $scope.websiteNameErrMsg = $scope.website.name + "已存在，请换个名字";
                    $scope.nextStepDisabled = true;
                } else {
                    $scope.websiteNameErrMsg = "";
                    $scope.nextStepDisabled = $scope.websiteDomainErrMsg;
                }
            });
        }

        $scope.checkWebsiteDomain = function () {
            if (!$scope.website.domain || $scope.website.domain.replace(/(^\s*)|(\s*$)/g, "") == "") {
                $scope.nextStepDisabled = $scope.websiteNameErrMsg;
                $scope.websiteDomainErrMsg = "";
                return;
            }

            $scope.website.domain = $scope.website.domain.replace(/(^\s*)|(\s*$)/g, "");
            util.http('POST', config.apiUrlPrefix + 'website', {domain: $scope.website.domain}, function (data) {
                if (data && data.length > 0 && $scope.website._id != data[0]._id) {
                    $scope.websiteDomainErrMsg = $scope.website.domain + "已存在，请换个名字";
                    $scope.nextStepDisabled = true;
                } else {
                    $scope.websiteDomainErrMsg = "";
                    $scope.nextStepDisabled = $scope.websiteNameErrMsg;
                }
            });
        }

        $scope.nextStep = function () {
            $scope.errMsg = "";
            if ($scope.step == 1) {
                if (!$scope.website.name) {
                    $scope.errMsg = "站点名为必填字段";
                    return;
                }
                if ($scope.websiteNameErrMsg || $scope.websiteUrlErrMsg) {
                    $scope.errMsg = "请正确填写相关信息";
                    return;
                }
            } else if ($scope.step == 2) {
                if ($scope.website.tags) {

                }
                $scope.nextStepDisabled = !$scope.website.templateId;
            } else if ($scope.step == 3) {
                if (!$scope.website.templateId) {
                    $scope.errMsg = "请选择站点类型和模板";
                    return;
                }
                $scope.nextStepDisabled = !$scope.website.styleId;
            } else if ($scope.step == 4) {
                if (!$scope.website.styleId) {
                    $scope.errMsg = "请选择模板样式";
                }
                createWebsiteRequest();
                return;
            } else {
                $state.go('website');
            }
            $scope.step++;
        }

        $scope.prevStep = function () {
            $scope.step--;
            $scope.nextStepDisabled = false;
        }


        $scope.goPreviewPage = function (style) {
            var url = window.location.href;
            var hash = window.location.hash;
            window.open(url.replace(hash, '') + '?' + style.previewFilename + '#/preview');
        }

        // 访问网站
        $scope.goWebsiteIndexPage = function (websiteName) {
            window.location.href = '/' + websiteName;
        }
    }];

    //controller.$inject = ['$scope', '$state', '$sce', 'Account'];
    app.registerController('newWebsiteController', controller);
    return htmlContent;
});