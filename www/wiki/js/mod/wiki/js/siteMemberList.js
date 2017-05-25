/**
 * Created by wuxiangan on 2017/3/21.
 */

define([
    'app',
    'helper/util',
    'helper/storage',
    'text!wikimod/wiki/html/siteMemberList.html'
], function (app, util, storage, htmlContent) {

    function getModParams(wikiblock) {
        var modParams = wikiblock.modParams || storage.sessionStorageGetItem("wikiModParams") || {};
        return angular.copy(modParams);
    }

    function registerController(wikiblock) {
        app.registerController('siteMemberListController', ['$scope', '$rootScope', function ($scope, $rootScope) {
            $scope.imgsPath = config.wikiModPath + 'wiki/assets/imgs/';
            var modParams = getModParams(wikiblock);
            var userinfo = $rootScope.userinfo;
            var siteinfo = $rootScope.siteinfo;
            $scope.modParams=modParams;
            console.log("--------------------");

            // 初始化信息
            function init() {
                console.log("--------------------");
                $scope.memberList = $scope.modParams.memberList || [];
                util.post(config.apiUrlPrefix + 'website_member/getByWebsiteId', {
                    page: 1,
                    pageSize: 8,
                    websiteId: siteinfo._id
                }, function (data) {
                    data = data || {};
                    $scope.memberList = $scope.memberList.concat(data.memberList);
                });
            }

            // 跳至用户页
            $scope.goUserPage = function (member) {
                util.go('/' + member.username);
            }

            $scope.$watch('$viewContentLoaded', function () {
                if (userinfo && siteinfo) {
                    modParams.username = userinfo.username;
                    modParams.sitename = siteinfo.name;
                    init();
                } else {
                    if (!modParams.username ||  !modParams.sitename) {
                        var urlObj = util.parseUrl();
                        modParams.username = urlObj.username;
                        modParams.sitename = urlObj.sitename;
                    }
                    util.post(config.apiUrlPrefix + "website/getUserSiteInfo", {username:modParams.username, sitename:modParams.sitename}, function (data) {
                        userinfo = data.userinfo;
                        siteinfo = data.siteinfo;
                        userinfo && siteinfo && init();
                    });
                }
            });
        }]);
    }

    return {
        render: function (wikiblock) {
            registerController(wikiblock);
            return htmlContent;
        }
    };
})

/*
 ```@wiki/js/organizationMemberList
 {
    "username": "xiaoyao",
    "sitename": "xiaoyao"
 }
 ```
 */
/*
```@wiki/js/organizationMemberList
 {
    "moduleKind":"gameDemo",
    "title":"评委成员",
    "memberList":[
        {
            "imgUrl":"",
            "username":"用户名",
            "level":"创建者"
        },
        {
             "imgUrl":"",
             "username":"用户名",
             "level":"创建者"
        },
        {
             "imgUrl":"",
             "username":"用户名",
             "level":"创建者"
        }
    ]
 }
```
 */