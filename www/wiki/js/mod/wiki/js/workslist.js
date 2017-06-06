
define([
    'app',
    'helper/util',
    'helper/storage',
    'text!wikimod/wiki/html/workslist.html',
], function (app, util, storage, htmlContent) {

    function getModParams(wikiblock) {
        var modParams = wikiblock.modParams || storage.sessionStorageGetItem("wikiModParams") || {};
        return angular.copy(modParams);
    }

    function registerController(wikiBlock) {
        app.registerController("workslistController", ['$rootScope', '$scope','Account','Message',function ($rootScope, $scope, Account, Message) {
            $scope.imgsPath = config.wikiModPath + 'wiki/assets/imgs/';
            $scope.requestUrl = config.apiUrlPrefix + "website_works/getByWebsiteId";
            $scope.requestParams = {pageSize: 3, page: 0};

            var modParams = getModParams(wikiBlock);
            var userinfo = $rootScope.userinfo;
            var siteinfo = $rootScope.siteinfo;

            $scope.modParams = modParams;

            $scope.getAllSiteList = function () {
                var siteshowObj = {};
                siteshowObj.requestUrl = $scope.requestUrl;
                siteshowObj.requestParams = $scope.requestParams;
                siteshowObj.title = $scope.title;
                storage.sessionStorageSetItem("siteshow", siteshowObj)
                window.location.href = config.frontEndRouteUrl + "#/siteshow";
            }

            $scope.goUserPage = function (work) {
                util.goUserSite('/' + work.worksUsername, true);
            }

            // 收藏作品
            $scope.worksFavorite=function (event, site) {
                Message.info("开发中");
            };

            $scope.getList = function (page) {
                var pageCount = 1;
                if ($scope.siteTotal) {
                    pageCount = $scope.siteTotal / requestParams.pageSize + ($scope.siteTotal % requestParams.pageSize && 1);
                }
                if (!util.pagination(page, $scope.requestParams, pageCount)) {
                    return;
                }

                util.http("POST", $scope.requestUrl, $scope.requestParams, function (data) {
                    data = data || {};
                    if (modParams.moduleKind == "personal") {
                        $scope.siteList = data.siteList;
                        $scope.siteTotal = data.total;
                    } else {
                        $scope.worksList = data.worksList;
                        $scope.worksTotal = data.total || 0;
                    }
                });
            }


            function init() {
                var pageSize = parseInt(modParams.pageSize || "3");
                pageSize = pageSize < 1 ? 1 : pageSize;
                $scope.requestParams.pageSize = pageSize;

                //console.log(moduleParams);
                $scope.title = modParams.title || "全部作品";
                if (modParams.moduleKind == "personal") {
                    if (modParams.type == "all") {   // 全部
                        $scope.requestUrl = config.apiUrlPrefix + "website/getAllByUsername";
                        $scope.requestParams.username = siteinfo.username;
                    }
                } else if (modParams.moduleKind == "organization" || modParams.moduleKind == "game") {
                    if (modParams.type == "all") {   // 全部
                        $scope.requestUrl = config.apiUrlPrefix + "website_works/getByWebsiteId";
                        $scope.requestParams.websiteId = siteinfo._id;
                    } else if (modParams.type == "custom") {  // 推荐
                        $scope.requestUrl = config.apiUrlPrefix + 'website_works/getByWorksUrlList';
                        $scope.requestParams.worksUrlList = modParams.worksUrlList || [];
                        $scope.requestParams.websiteId = siteinfo._id;
                    } else if (modParams.type == "latestJoin") {  // 推荐
                        $scope.requestUrl = config.apiUrlPrefix + 'website_works/getLatestByWebsiteId';
                        $scope.requestParams.websiteId = siteinfo._id;
                    }
                    /*
                    else if (moduleParams.type == "latestUpdate") { // 最近更新
                        $scope.requestUrl = config.apiUrlPrefix + "website_renewal";
                        $scope.requestParams.websiteId = $scope.siteinfo._id;
                    } else if (moduleParams.type == "latestNew") {  // 最近加入
                        $scope.requestUrl = config.apiUrlPrefix + "website_works/getLatestByWebsiteId";
                        $scope.requestParams.websiteId = $scope.siteinfo._id;
                    } else if (moduleParams.type == "favorite") {   // 我的收藏
                        $scope.requestUrl = config.apiUrlPrefix + "user_favorite/getFavoriteWebsiteListByUserId";
                        $scope.requestParams.userId = $scope.userinfo._id;
                    } else if (moduleParams.type == "hot") { // 热门精选
                        $scope.requestUrl = config.apiUrlPrefix + "website_works/getHotByWebsiteId";
                        $scope.requestParams.websiteId = $scope.siteinfo._id;
                    } else if (moduleParams.type == "upgrade") {  // 入围作品
                        $scope.requestUrl = config.apiUrlPrefix + "website_works/getUpgradeByWebsiteId";
                        $scope.requestParams.websiteId = $scope.siteinfo._id;
                    } else {
                        $scope.requestUrl = config.apiUrlPrefix + "website/getByUserId";
                        $scope.requestParams.userId = $scope.userinfo._id;
                    }
                    */
                }
                $scope.getList();
            }
            $scope.$watch("$viewContentLoaded", function () {
                if (userinfo && siteinfo) {
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
        render: function (wikiBlock) {
            registerController(wikiBlock);
            return htmlContent;
        }
    };
});

/*```@wiki/js/workslist
{
    "moduleKind":"personal"
}
```*/
/*
```@wiki/js/workslist
{
    "moduleKind":"organization",
    "pageSize":8,
    "type":"all",
    "title":"全部作品"
}
```
*/
/*
```@wiki/js/workslist
{
"moduleKind":"gameDemo",
"title":"全部作品",
"moreLink":"http://www.baidu.com",
"worksList":[
    {
        "imgLink":"#",
        "imgUrl":"",
        "workLink":"#",
        "workName":"作品名",
        "authorLink":"#",
        "author":"作者"
    },
    {
        "imgLink":"#",
        "imgUrl":"",
        "workLink":"",
        "workName":"作品名",
        "authorLink":"",
        "author":"作者"
    },
    {
        "imgLink":"#",
        "imgUrl":"",
        "workLink":"",
        "workName":"作品名",
        "authorLink":"",
        "author":"作者"
    },
    {
        "imgLink":"#",
        "imgUrl":"",
        "workLink":"",
        "workName":"作品名",
        "authorLink":"",
        "author":"作者"
    }
]
}
```
*/
/*
```@wiki/js/workslist
 {
 "moduleKind":"game",
 "title":"全部作品",
 "type":"all",
 "moreLink":"http://www.baidu.com",
 "worksList":[
 {
 "workLink":"#",
 "imgUrl":"",
 "workName":"作品名",
 "authorLink":"#",
 "author":"作者",
 "info":"浏览量",
 "count":"5"
 },
 {
 "workLink":"#",
 "imgUrl":"",
 "workName":"作品名",
 "authorLink":"#",
 "author":"作者",
 "info":"浏览量",
 "count":"5"
 },
 {
 "workLink":"#",
 "imgUrl":"",
 "workName":"作品名",
 "authorLink":"#",
 "author":"作者",
 "info":"浏览量",
 "count":"5"
 },
 {
 "workLink":"#",
 "imgUrl":"",
 "workName":"作品名",
 "authorLink":"#",
 "author":"作者",
 "info":"浏览量",
 "count":"5"
 },
 {
 "workLink":"#",
 "imgUrl":"",
 "workName":"作品名",
 "authorLink":"#",
 "author":"作者",
 "info":"浏览量",
 "count":"5"
 }
 ]
 }
```
 */
