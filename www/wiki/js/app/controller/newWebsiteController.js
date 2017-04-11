/**
 * Created by wuxiangan on 2016/12/21.
 */

define([
    'app',
    'helper/util',
    'helper/storage',
    'text!html/newWebsite.html',
    'controller/editWebsiteController',
], function (app, util, storage, htmlContent, editWebsiteHtmlContent) {
    var controller = ['$rootScope','$scope', '$sce', 'Account', function ($rootScope, $scope, $sce, Account) {
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

        $scope.nextStep = function () {
            $scope.errMsg = "";
            if ($scope.step == 1) {
                if (!$scope.website.displayName) {
                    $scope.errMsg = "站点名为必填字段";
                    return;
                }
                $scope.websiteNameErrMsg = "";
                $scope.nextStepDisabled = false;
                $scope.step++;
                return;
            } else if ($scope.step == 2) {
                if (!$scope.website.name || $scope.website.name.replace(/(^\s*)|(\s*$)/g, "") == "") {
                    $scope.errMsg = "域名为必填字段";
                    return;
                } else {
                    var isValid = /[\d\w]+/.test($scope.website.name);
                    if (!isValid) {
                        $scope.errMsg = "域名只能为数字和字母组合";
                        return;
                    }
                    $scope.website.name = $scope.website.name.replace(/(^\s*)|(\s*$)/g, "");
                    util.http('POST', config.apiUrlPrefix + 'website_domain/checkDomain', {domain: $scope.website.name}, function (data) {
                        if (data == 0) {
                            $scope.errMsg = $scope.website.name + "已存在，请换个名字";
                        } else {
                            $scope.step++;
                        }
                    });
                }
                return;
            } else if ($scope.step == 3) {
                $scope.nextStepDisabled = !$scope.website.templateId;
            } else if ($scope.step == 4) {
                if (!$scope.website.templateId) {
                    $scope.errMsg = "请选择站点类型和模板";
                    return;
                }
                $scope.nextStepDisabled = !$scope.website.styleId;
            } else if ($scope.step == 5) {
                if (!$scope.website.styleId) {
                    $scope.errMsg = "请选择模板样式";
                    return ;
                }
            } else if ($scope.step == 6) {
                $scope.website.userId = $scope.user._id;
                $scope.website.username = $scope.user.username;

                util.http('PUT', config.apiUrlPrefix + "website/new", $scope.website, function (data) {
                    $scope.website = data;
                    $scope.step++;
                });
                return
            } else{
                //createWebsiteRequest();
                $rootScope.$broadcast('userCenterContentType', 'websiteManager');
            }
            $scope.step++;
        }

        $scope.prevStep = function () {
            $scope.step--;
            $scope.nextStepDisabled = false;
        }

        function init() {
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
                $scope.category = $scope.categories[0];
                $scope.template = $scope.templates[0];
                $scope.style = $scope.styles[0];
            });
        }

        // 文档加载完成
        $scope.$watch('$viewContentLoaded', init);

        function createWebsiteRequest() {

        }

        $scope.getActiveStyleClass = function (category) {
            return category._id == $scope.website.categoryId ? 'active' : '';
        }

        $scope.selectCategory = function (category) {
            $scope.category = category;
            $scope.templates = category.templates;
            $scope.styles = category.templates[0].styles;
            $scope.website.categoryId = category._id;
            $scope.website.categoryName = category.name;
            $scope.website.templateId = $scope.templates[0]._id;
            $scope.website.templateName = $scope.templates[0].name;
            $scope.website.styleId = $scope.styles[0]._id;
            $scope.website.styleName = $scope.styles[0].name;
            $scope.nextStepDisabled = false;
            $scope.template = $scope.templates[0];
            $scope.style = $scope.styles[0];
        }

        $scope.selectTemplate = function (template) {
            $scope.template = template;
            $scope.styles = template.styles;
            $scope.website.templateId = template._id;
            $scope.website.templateName = template.name;
            $scope.website.styleId = $scope.styles[0]._id;
            $scope.website.styleName = $scope.styles[0].name;
            $scope.nextStepDisabled = false;
            $scope.website.logoUrl=template.logoUrl;
            $scope.style = $scope.styles[0];
        }

        $scope.selectStyle = function (style) {
            $scope.style = style;
            $scope.website.styleId = style._id;
            $scope.website.styleName = style.name;
            $scope.nextStepDisabled = false;
            $scope.style.logoUrl=style.logoUrl;
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

        $scope.checkWebsiteDisplayName = function () {
            if (!$scope.website.displayName || $scope.website.displayName.replace(/(^\s*)|(\s*$)/g, "") == "") {
                return;
            }
            $scope.nextStepDisabled = false;
        }

        $scope.checkWebsiteName = function () {
            if (!$scope.website.name || $scope.website.name.replace(/(^\s*)|(\s*$)/g, "") == "") {
                return;
            }
            $scope.website.name = $scope.website.name.replace(/(^\s*)|(\s*$)/g, "");
            if (/^['\d\w']+$/.test($scope.website.name)){
                $scope.nextStepDisabled = false;
                $scope.website.domain = $scope.website.name;
            }else{
                $scope.nextStepDisabled = true;
            }
        }

        $scope.goPreviewPage = function (style) {
            var url = window.location.href;
            var hash = window.location.hash;
            window.open(url.replace(hash, '') + '?' + style.previewFilename + '#/preview');
        }

        // 访问网站
        $scope.goWebsiteIndexPage = function (websiteName) {
            util.goUserSite('/' + $scope.user.username + '/' + $scope.website.name + '/index');
        }

        //网站设置
        $scope.goEditWebsitePage = function () {
            storage.sessionStorageSetItem("editWebsiteParams", $scope.website);
            storage.sessionStorageSetItem("userCenterContentType", "editWebsite");
            util.go('userCenter', true);
            //window.open(window.location.href);
        }
    }];

    //controller.$inject = ['$scope', '$state', '$sce', 'Account'];
    app.registerController('newWebsiteController', controller);
    return htmlContent;
});