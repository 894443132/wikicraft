/**
 * Created by wuxiangan on 2016/12/19.
 */

define([
    'app',
    'markdown-it',
    'helper/markdownwiki',
    'helper/storage',
    'helper/util',
    'helper/dataSource',
    'helper/loading',
    'controller/homeController',
    'controller/headerController',
    'controller/footerController',
    'controller/userController',
    'controller/notfoundController',
], function (app, markdownit, markdownwiki, storage, util, dataSource, loading, homeHtmlContent, headerHtmlContent, footerHtmlContent, userHtmlContent, notfoundHtmlContent) {
    var md = markdownwiki({html: true});

    app.controller('mainController', [
        '$scope',
        '$rootScope',
        '$sce',
        '$location',
        '$http',
        '$auth',
        '$compile',
        'Account',
        'Message',
        'github',
        'modal',
        'gitlab',
        'confirmDialog',
        function ($scope, $rootScope, $sce, $location, $http, $auth, $compile, Account, Message, github, modal, gitlab, confirmDialog) {
            //console.log("mainController");
            
            // 初始化基本信息
            function initBaseInfo() {
                //配置一些全局服务
                config.services = {
                    $rootScope: $rootScope,
                    $sce:$sce,
                    $http: $http,
                    $compile: $compile,
                    $auth: $auth,
                    $location:$location,
                    markdownit:markdownit({}),
                    storage: storage,
                    Account: Account,
                    Message: Message,
                    github: github,
                    gitlab:gitlab,
                    dataSource:dataSource,
                    loading:loading,
                    confirmDialog:confirmDialog,
                };

                util.setAngularServices({
                    $rootScope: $rootScope,
                    $http: $http,
                    $compile: $compile,
                    $auth: $auth,
                    $location:$location,
                });

                util.setSelfServices({
                    config: config,
                    storage: storage,
                    Account: Account,
                    Message: Message,
                    github: github,
                    gitlab:gitlab,
                    dataSource:dataSource,
                    loading:loading,
                    confirmDialog:confirmDialog,
                });

                $rootScope.imgsPath = config.imgsPath;
                $rootScope.cssPath = config.cssPath;
                $rootScope.user = Account.getUser();
                $rootScope.userinfo = $rootScope.user;
                if (config.isLocal()) {
                    $rootScope.frameHeaderExist = true;
                    $rootScope.frameFooterExist = true;
                } else {
                    $rootScope.frameHeaderExist = config.isOfficialDomain(window.location.hostname);
                    $rootScope.frameFooterExist = config.isOfficialDomain(window.location.hostname);
                }

                $rootScope.isLogin = Account.isAuthenticated();
                $rootScope.isSelfSite = function () {
                    return $rootScope.user._id == $rootScope.userinfo._id;
                }

                $rootScope.getImageUrl = function(imgUrl,imgsPath) {
                    if (imgUrl.indexOf("://") >= 0) {
                        return imgUrl;
                    }
                    if (imgUrl.indexOf("/wiki/") >= 0) {
                        return imgUrl + "?bust=" + config.bustVersion;
                    }

                    return (imgsPath || $rootScope.imgsPath) + imgUrl + "?bust=" + config.bustVersion;
                }

                $rootScope.getCssUrl = function(cssUrl, cssPath) {
                    if (cssUrl.indexOf("://") >= 0) {
                        return cssUrl;
                    }
                    if (cssUrl.indexOf("/wiki/") >= 0) {
                        return cssUrl + "?bust=" + config.bustVersion;
                    }

                    return (cssPath || $rootScope.cssPath) + cssUrl + "?bust=" + config.bustVersion;
                }
                
                $rootScope.getRenderText = function (text) {
                    return $sce.trustAsHtml(config.services.markdownit.render(text || ""));
                }
            }

            // 底部高度自适应
            function stickFooter() {
                var winH=$(window).height();
                var headerH=52;
                var footerH=100;
                var minH=winH-headerH-footerH;
                var w = $("#__mainContent__");
                w.css("min-height", minH);
            }

            function throttle(method, context) {
                clearTimeout(method.stickTimer);
                method.stickTimer = setTimeout(function () {
                    method.call(context);
                },100);
            }

            window.onresize = function () {
                throttle(stickFooter);
            };

            function initView() {

                // 信息提示框
                $("#messageTipCloseId").click(function () {
                    Message.hide();
                });

                if ($rootScope.frameHeaderExist) {
                    util.html('#__wikiHeader__', headerHtmlContent, $scope);
                }
                if ($rootScope.frameFooterExist) {
                    util.html('#__wikiFooter__', footerHtmlContent, $scope);
                }
                
                $rootScope.getBodyStyle = function () {
                    return {
                        "padding-top": $rootScope.frameHeaderExist ? "56px" : "0px",
                    };
                }

                // 页面重载回调
                // $(window).on("beforeunload", function () {
                //
                // });

                stickFooter();

                var isFirstLocationChange = true;
                // 注册路由改变事件, 改变路由时清空相关内容
                $rootScope.$on('$locationChangeSuccess', function () {
                    //console.log("$locationChangeSuccess change");
                    if (!isFirstLocationChange && util.isEditorPage()) {
                        return ;
                    }
                    isFirstLocationChange = false;
                    config.loadMainContent(initContentInfo);
                });
            }

            function setWindowTitle(urlObj) {
                var pathname = urlObj.pathname;
                //console.log(pathname);
                var paths = pathname.split('/');
                if (paths.length > 1 && paths[1]) {
                    $rootScope.title = paths[paths.length-1] + (paths.length > 2 ? (' - ' +paths.slice(1,paths.length-1).join('/')) : "");
                } else {
                    $rootScope.title = config.hostname.substring(0,config.hostname.indexOf('.'));
                }
            }

            function getUserPage() {
                var urlObj = $rootScope.urlObj;
                // 访问用户页
                $rootScope.userinfo = undefined;
                $rootScope.siteinfo = undefined;
                $rootScope.pageinfo = undefined;
                $rootScope.tplinfo = undefined;
                if (urlObj.username && urlObj.sitename) {
                    util.http("POST", config.apiUrlPrefix + "website/getDetailInfo", {
                        username: urlObj.username,
                        sitename: urlObj.sitename,
                        pagename: urlObj.pagename || 'index',
                        userId:$rootScope.user && $rootScope.user._id,
                    }, function (data) {
                        data = data || {};
                        // 这三种基本信息根化，便于用户页内模块公用
                        $rootScope.userinfo = data.userinfo;
                        $rootScope.siteinfo = data.siteinfo || {};
                        $rootScope.pageinfo = {username:urlObj.username,sitename:urlObj.sitename, pagename:urlObj.pagename, pagepath:urlObj.pagepath};
                        $rootScope.tplinfo = {username:urlObj.username,sitename:urlObj.sitename, pagename:"_theme"};

                        var userDataSource = dataSource.getUserDataSource(data.userinfo.username);
						var callback = function() {
							if (!$scope.user || $scope.user.username != data.userinfo.username) {
								userDataSource.init(data.userinfo.dataSource, data.userinfo.defaultDataSourceSitename);
							}
							userDataSource.registerInitFinishCallback(function () {
								var currentDataSource = dataSource.getDataSource($rootScope.pageinfo.username, $rootScope.pageinfo.sitename);
								var renderContent = function (content) {
									$rootScope.$broadcast('userpageLoaded',{});
									content = md.render((content!=undefined) ? content :  notfoundHtmlContent);
									util.html('#__UserSitePageContent__', content, $scope);
									config.loading.hideLoading();
								};
								//if (config.isLocal()) {
									//currentDataSource.setLastCommitId("master");
								//}

								if (window.location.search && window.location.search.indexOf('branch=master') >= 0) {
									currentDataSource.setLastCommitId('master');
								}

								//console.log(currentDataSource);
								currentDataSource.getRawContent({path:urlObj.pagepath + config.pageSuffixName}, function (data) {
									//console.log(data);
									//console.log("otherUsername:", urlObj.username);
									storage.sessionStorageSetItem("otherUsername", urlObj.username);
									renderContent(data);
								}, function () {
									renderContent();
								});
							});
						}
						// 使用自己的token
						if (Account.isAuthenticated()) {
							Account.getUser(function(userinfo){
								if (userinfo.username != data.userinfo.username) {
									for (var i=0; i < data.userinfo.dataSource.length; i++) {
										var ds1 = data.userinfo.dataSource[i];
										for (var j = 0; j < userinfo.dataSource.length; j++) {
											var ds2 = userinfo.dataSource[j];
											if (ds1.apiBaseUrl == ds2.apiBaseUrl) {
												ds1.dataSourceToken = ds2.dataSourceToken;
												ds1.isInited = true;
											}
										}
									} 
								}
								callback();
							})
						} else {
							callback();
						}
                    });
                } else if (urlObj.username){
                    util.html('#__UserSitePageContent__', userHtmlContent, $scope);
					config.loading.hideLoading();
                }
            }

            // 加载内容信息
            function initContentInfo() {
                util.html('#__UserSitePageContent__', '<div></div>', $scope);
                $rootScope.urlObj = util.parseUrl();

                var urlObj = $rootScope.urlObj;
                // 置空用户页面内容
                console.log(urlObj);
                setWindowTitle(urlObj);
				
				if (!util.isEditorPage()) {
					storage.sessionStorageRemoveItem("otherUsername");
				}

                if (config.mainContent) {
                    if (config.mainContentType == "wiki_page") {
						if (urlObj.pathname == "/wiki/test") {
							config.mainContent = md.render(config.mainContent);
						}
                        util.html('#__UserSitePageContent__', config.mainContent, $scope);
                        //config.mainContent = undefined;
                    } else {
                        util.html('#__UserSitePageContent__', config.mainContent, $scope);
                        config.mainContent = undefined;
                    }
                } else if (!urlObj.username){
                    if (Account.isAuthenticated()) {
                        Account.getUser(function (userinfo) {
                            util.go("/" + userinfo.username);
						}, function() {
							Account.logout();
						    window.location.reload();
							//util.html('#__UserSitePageContent__', homeHtmlContent, $scope);
						});
                    } else {
                        util.html('#__UserSitePageContent__', homeHtmlContent, $scope);
                    }
                } else {
					config.loading.showLoading();
                    if (urlObj.domain && !config.isOfficialDomain(urlObj.domain)) {
                        util.post(config.apiUrlPrefix + 'website/getByDomain',{domain:urlObj.domain}, function (data) {
                            if (data) {
                                urlObj.username = data.username;
                                urlObj.sitename = data.name;
                            }
                            getUserPage();
                        }, function () {
                            getUserPage();
                        });
                    } else {
                        getUserPage();
                    }
                }

            }

            function init() {
                initBaseInfo();
                initView();
            }

            init();

            $scope.$on("onUserProfile", function (event, user) {
                //console.log('onUserProfile -- mainController');
                $scope.user = user;
                //init();
            });
        }]);

});
