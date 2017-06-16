/**
 * Created by wuxiangan on 2017/1/10.
 */

define([
    'app',
    'to-markdown',
    'codemirror',
    'helper/markdownwiki',
    'helper/util',
    'helper/storage',
    'helper/dataSource',
    'text!html/wikiEditor.html',
    'codemirror/mode/markdown/markdown',
    // 代码折叠
    'codemirror/addon/fold/foldgutter',
    'codemirror/addon/fold/foldcode',
    'codemirror/addon/fold/markdown-fold',
    'codemirror/addon/fold/xml-fold',
    // 错误提示
    'codemirror/addon/lint/json-lint',
    'codemirror/addon/search/search',
    'codemirror/addon/dialog/dialog',
    'codemirror/addon/edit/continuelist',
    'codemirror/addon/search/searchcursor',
    'codemirror/addon/search/matchesonscrollbar',
    'codemirror/addon/search/jump-to-line',
    'codemirror/addon/scroll/annotatescrollbar',
    'codemirror/addon/display/fullscreen',
    'bootstrap-treeview',
], function (app, toMarkdown, CodeMirror, markdownwiki, util, storage, dataSource, htmlContent) {
    //console.log("wiki editor controller!!!");
    var otherUserinfo = undefined;
    var pageSuffixName = config.pageSuffixName;
    var mdwiki = markdownwiki({editorMode: true, breaks: true});
    var editor;
    var allWebsites = [];
    var allWebsitePages = [];
    var allWebstePageContent = {};
    var allPageMap = {};                  // 页面映射
    var currentSite = undefined;     // 当前站点
    var currentPage = undefined;        // 当前页面
    var editorDocMap = {};           // 每个文件对应一个文档
    var isHTMLViewEditor = false;   // 是否h5视图编辑
    var currentRichTextObj = undefined; // 当前编辑的富文本
    var treeNodeMap = {};            // 树节点映射
    var treeNodeExpandedMap = {};    // 展开节点
    var pagelistMap = {};            // 页列表映射
    var urlParamsMap = {};            // url 参数映射

    function getCurrentDataSource() {
		if (currentPage && currentPage.username) {
			return dataSource.getDataSource(currentPage.username, currentPage.sitename);
		}

		return dataSource.getDefaultDataSource()
    }

    function getTreeData(username, pageMap, isDir) {
        var pageTree = {url: '/' + username, children: {}};
        var treeData = [];
        for (var key in pageMap) {
            var page = pageMap[key];
            if (page.isDelete || !page.url || page.url.indexOf('/' + username) != 0) {
                continue;
            }

            var url = page.url;
            url = url.trim();
            var paths = page.url.split('/');
            var treeNode = pageTree;
            var length = isDir ? paths.length - 1 : paths.length;
            for (var j = 2; j < length; j++) {
                var path = paths[j];
                if (!path) {
                    continue;
                }
                subTreeNode = treeNode.children[path] || {
                        name: path,
                        children: {},
                        url: treeNode.url + '/' + path,
                        sitename: page.sitename,
                        username: page.username,
                    };

                treeNode.children[path] = subTreeNode;
                treeNode.isLeaf = false;
                if (j == paths.length - 1) {
                    subTreeNode.isLeaf = true;
                    if (!isDir && page.isModify) {
                        subTreeNode.isEditor = true;
						subTreeNode.isConflict = page.isConflict;
                    }
                }
                treeNode = subTreeNode;
            }
        }
        // 加上所有站点
        for (var i = 0; i < allWebsites.length; i++) {
            var isExist = false;
            var site = allWebsites[i];

            if (site.username != username) {
                continue;
            }

            for (key in pageTree.children) {
                if (key == site.name) {
                    var node = pageTree.children[key];
                    node.name = site.displayName + '(' + site.name + ')';
                    isExist = true;
                    break;
                }
            }

            if (isExist)
                continue;

            pageTree.children[site.name] = {
                name: site.displayName + '(' + site.name + ')',
                url: '/' + site.username + '/' + site.name,
                sitename: site.name,
                username: site.username,
                children: {},
            }
        }
        //console.log(pageTree.children);

        var treeDataFn = function (treeNode, pageNode) {
            treeNode = treeNode || {};
            treeNode.text = (pageNode.isLeaf && pageNode.isEditor) ? (pageNode.name + (pageNode.isConflict ? '*<-' : '*')) : pageNode.name;
            treeNode.icon = (pageNode.isLeaf && pageNode.isEditor) ? 'fa fa-edit' : 'fa fa-file-o';
            treeNode.pageNode = pageNode;
            treeNode.tags = [
                "<span class='close-icon show-empty-node' onclick='angular.element(this).scope().cmd_close()'>&times;</span>",
                "<span class='show-empty-node glyphicon glyphicon-trash' onclick='angular.element(this).scope().cmd_remove()'></span>",
                "<span class='show-empty-node glyphicon glyphicon-repeat' onclick='angular.element(this).scope().cmd_refresh("+ '"' + pageNode.url+ '"' +")'></span>",
            ];
            treeNode.state = {selected: currentPage && currentPage.url == pageNode.url};

            if (!pageNode.isLeaf) {
                treeNode.nodes = [];
                for (key in pageNode.children) {
                    treeNode.nodes.push(treeDataFn(undefined, pageNode.children[key]));
                }
            }
            return treeNode;
        };

        for (key in pageTree.children) {
            treeData.push(treeDataFn(undefined, pageTree.children[key]));
        }

        for (var i = 0; i < treeData.length; i++) {
            treeData[i].icon = 'fa fa-globe';
            treeData[i].tags=[];
            treeData[i].tags.push([
                "<img class='show-parent' onclick='angular.element(this).scope().cmd_closeAll()' src='"+angular.element("#mytree").scope().imgsPath+"icon/wiki_closeAll.png'>",
                "<img class='show-parent' onclick='angular.element(this).scope().cmd_newFile()' src='"+angular.element("#mytree").scope().imgsPath+"icon/wiki_newFile.png'>",
                "<img class='show-parent' onclick='angular.element(this).scope().cmd_newpage(true)' ng-src='' src='"+angular.element("#mytree").scope().imgsPath+"icon/wiki_newPage.png'>",
            ]);
        }
        return treeData;
    }


    app.registerController('imgCtrl', ['$scope', '$rootScope', '$uibModalInstance', 'github', function ($scope, $rootScope, $uibModalInstance, github) {
        $scope.img = {url: '', txt: '', file: '', dat: '', nam: ''};

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        }

        $scope.img_insert = function () {
            $rootScope.img = $scope.img;
            $uibModalInstance.close("img");
        }

        $scope.imageLocal = function () {
            var currentDataSource = getCurrentDataSource();
            $('#uploadImageId').change(function (e) {
                var fileReader = new FileReader();
                fileReader.onload = function () {
                    currentDataSource && currentDataSource.uploadImage({content: fileReader.result}, function (url) {
                        $scope.img.url = url;
                    });
                };
                fileReader.readAsDataURL(e.target.files[0]);
            });
        }
    }]);

    app.registerController('videoCtrl', ['$scope', '$rootScope', '$uibModalInstance', 'github', function ($scope, $rootScope, $uibModalInstance, github) {
        $scope.video = {url: '', txt: '', file: '', dat: '', nam: ''};

        $scope.cancel = function () {
            $uibModalInstance.dismiss('');
        }

        $scope.video_insert = function () {
            $uibModalInstance.close($scope.videoUrl);
        }
    }]);

    app.registerController('linkCtrl', ['$scope', '$rootScope', '$uibModalInstance', function ($scope, $rootScope, $uibModalInstance) {
        $scope.link = {url: '', txt: ''};

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        }

        $scope.urlSelected = function ($item, $model) {
            $scope.url = $item.url;
        }

        $scope.link_insert = function () {
            $rootScope.link = {url: $scope.url || "", txt: ''};
            $uibModalInstance.close("link");
        }

        var itemArray = [];
        for (var key in allPageMap) {
            itemArray.push({url: allPageMap[key].url});
        }
        $scope.itemArray = itemArray;
    }]);

    app.registerController('tableCtrl', ['$scope', '$rootScope', '$uibModalInstance', function ($scope, $rootScope, $uibModalInstance) {
        $scope.table = {rows: 2, cols: 2, alignment: 0};

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        }

        $scope.table_insert = function () {
            $rootScope.table = $scope.table;
            if ($scope.table.rows < 1 || $scope.table.cols < 1) {
                $scope.errInfo = "表格行,列必须为大于0的整数";
                return;
            }
            $uibModalInstance.close("table");
        }
    }]);

    app.registerController('pageCtrl', ['$scope', '$rootScope', '$http', '$uibModalInstance', function ($scope, $rootScope, $http, $uibModalInstance) {
        $scope.website = {};             //当前选中站点
        $scope.websitePage = {};        //当前选中页面
        $scope.errInfo = "";             // 错误提示
        var treeNode = undefined;       // 目录节点

        $scope.$watch('$viewContentLoaded', init);
        //初始化目录树  data:  $.parseJSON(getTree()),
        function initTree() {
            //console.log('@initTree');
            $('#newPageTreeId').treeview({
                color: "#428bca",
                showBorder: false,
                enableLinks: false,
                data: getTreeData($scope.user.username, allPageMap, true),
                onNodeSelected: function (event, data) {
                    //console.log(data);
                    treeNode = data.pageNode;
                }
            });
            var currentInfo=$scope.nowHoverPage || currentPage;
            if (currentInfo) {
                var selectableNodes = $('#newPageTreeId').treeview('search', [currentInfo.sitename, {
                    ignoreCase: true,
                    exactMatch: false,
                    revealResults: true,  // reveal matching nodes
                }]);

                $.each(selectableNodes, function (index, item) {
                    if (item.pageNode.url == ('/' + currentInfo.username + '/' + currentInfo.sitename)) {
                        $('#newPageTreeId').treeview('selectNode', [item, {silent: false}]);
                        treeNode = item.pageNode;
                    }
                });
                $('#newPageTreeId').treeview('clearSearch');
            }
        }

        //初始化
        function init() {
            initTree();
        }

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        }

        $scope.website_new = function () {
            if (!treeNode) {
                $scope.errInfo = '请选择站点';
                return false;
            }

            if ($scope.websitePage.pagename === undefined || $scope.websitePage.pagename.length == 0) {
                $scope.errInfo = '请填写页面名';
                return false;
            }

            if ($scope.websitePage.pagename.indexOf('.') >= 0) {
                $scope.errInfo = '页面名包含非法字符(.)';
                return false;
            }

            $scope.websitePage.url = treeNode.url + '/' + $scope.websitePage.pagename;
            $scope.websitePage.username = $scope.user.username;
            $scope.websitePage.sitename = treeNode.sitename;
            $scope.websitePage.isModify = true;
            for (var key in allPageMap) {
                if (!allPageMap[key])
                    continue;

                var url1 = allPageMap[key].url + '/';
                var url2 = $scope.websitePage.url + '/';
                if (url1.indexOf(url2) == 0 || url2.indexOf(url1) == 0) {
                    $scope.errInfo = '页面路径已存在';
                    return false;
                }
            }

            currentPage = $scope.websitePage;
            $uibModalInstance.close("page");
        }
    }]);

    app.registerController('wikiEditorController', ['$scope', '$rootScope', '$location', '$http', '$location', '$uibModal', 'Account', 'github', 'Message', 'modal', 'gitlab',
        function ($scope, $rootScope, $location, $http, $location, $uibModal, Account, github, Message, modal) {
            $(window).on("beforeunload", function (e) {
                if (currentPage.isModify) {
                    e = e || window.event;
                    var returnValue = '您的页面还未保存，需要手动保存';
                    e.returnValue = returnValue;
                    return returnValue;
                }
            });

            //console.log("wikiEditorController");
            $rootScope.frameFooterExist = false;
            $rootScope.frameHeaderExist = false;
            $rootScope.userinfo = $rootScope.user;

            $scope.enableTransform = true;
            $scaleValue = "";
            $scope.scales = [
                {"id":0,"showValue": "45%", "scaleValue": "0.25"},
                {"id":1,"showValue": "50%", "scaleValue": "0.5"},
                {"id":2,"showValue": "75%", "scaleValue": "0.75"},
                {"id":3,"showValue": "100%", "scaleValue": "1"},
                {"id":4,"showValue": "实际大小", "scaleValue": "1", "special":true}
            ];
            $scope.showFile=true;
            $scope.showCode=true;
            $scope.showView=true;
            $scope.full=false;
            $scope.opens={};

            // 判断对象是否为空
            function isEmptyObject(obj) {
                for (var key in obj) {
                    return false;
                }
                return true;
            }

            // 格式化html文本
            function formatHtmlView(cmd, value) {
                document.execCommand(cmd, false, value);
                currentRichTextObj && currentRichTextObj.focus();
            }

            // 删除本地indexDB记录 缓存5分钟(应该大于浏览器缓存时间), 解决浏览器缓存导致读取的不是最新内容问题
			// 刷新页面 会执行loadUnSavePage() 加载该内容 故getRawContent无需读indexdb
            function indexDBDeletePage(url, isDelay) {
                var urlParams = urlParamsMap[url] || {};
                urlParamsMap[url] = urlParams;
                urlParams.deleteTimer && clearTimeout(urlParams.deleteTimer);
				if (isDelay) {
					urlParams.deleteTimer = setTimeout(function () {
						storage.indexedDBDeleteItem(config.pageStoreName, url);
						urlParams.deleteTimer = undefined;
					}, 300 * 1000);
				} else {
					storage.indexedDBDeleteItem(config.pageStoreName, url);
					urlParams.deleteTimer = undefined;
				}
            }

            // 加载未提交到服务的页面
            function loadUnSavePage() {
				var currentTime = (new Date()).getTime();
                storage.indexedDBGet(config.pageStoreName, function (page) {
					if (!isUserExist() || !page.username || !page.sitename || !page.pagename || !page.url || (page.username != $scope.user.username)) {
						return;
					}
					
                    var serverPage = getPageByUrl(page.url);
                    if (!serverPage) {
                        if (!getCurrentWebsite(page.username, page.sitename)) {
                            return;
                        }
                        serverPage = allPageMap[page.url] = page;
                    }

                    if (!page.isModify || (currentTime - (page.updateTime) >= 300 * 1000)) {   // 没有修改删除本地
                        indexDBDeletePage(page.url);
                        return;
                    }

                    serverPage.isModify = page.isModify;
                    //console.log(page);
                    allWebstePageContent[page.url] = page.content;
                }, undefined, function () {
                    initTree();
                });
            }

            function loadSitePageInfo() {
                var _openPage = function () {
                    initTree();
                    openPage();
                };
                
                var fnList = [];
                
                // 获取自己的站点列表
                fnList.push(function (finish) {
                    if ($scope.user && $scope.user._id) {
                        // 获取用户所有站点
                        util.post(config.apiUrlPrefix + 'website/getAllByUserId', {userId: $scope.user._id}, function (data) {
                            allWebsites = (allWebsites || []).concat(data || []);
                            finish && finish();
                        }, finish);
                    } else {
                        finish && finish();
                    }
                });

                // 获取他人站点列表
                fnList.push(function (finish) {
                    if (otherUserinfo && otherUserinfo._id) {
                        util.post(config.apiUrlPrefix + 'website/getAllByUserId', {userId: otherUserinfo._id}, function (data) {
                            allWebsites = (allWebsites || []).concat(data || []);
                            finish && finish();
                        }, finish);
                    } else {
                        finish && finish();
                    }
                });
                
                fnList.push(function (finish) {
                    dataSource.getUserDataSource($scope.user.username).registerInitFinishCallback(finish);
                });

                fnList.push(function (finish) {
                    if (otherUserinfo) {
                        dataSource.getUserDataSource(otherUserinfo.username).registerInitFinishCallback(finish);
                    } else {
                        finish && finish();
                    }
                });

                util.batchRun(fnList, function () {
                    //初始化本地数据库indexDB
                    storage.indexedDBRegisterOpenCallback( function () {
                        loadUnSavePage();
                        _openPage();
                    });
                });
            }

            // 用户是否存在
            function isUserExist() {
                if ($scope.user && $scope.user.username) {
                    return true;
                }
                return false;
            }

            // 其它用户是否存在
            function isOtherUserExist() {
                if (otherUserinfo && otherUserinfo.username) {
                    return true;
                }
                return false;
            }

            // 通过用户名获取treeID
            function getTreeId(username) {
                if (isUserExist() && $scope.user.username == username) {
                    return '#mytree';
                }

                if (isOtherUserExist() && otherUserinfo.username == username) {
                    return "#othertree";
                }
                console.log("get tree id errors:", username);
                return '#mytree';
            }

            // 通过用户名获取userinfo
            function getUserinfo(username) {
                if (isUserExist() && $scope.user.username == username) {
                    return $scope.user;
                }

                if (isOtherUserExist() && otherUserinfo.username == username) {
                    return otherUserinfo;
                }
                console.log("get tree info errors:", username);
                return $scope.user || otherUserinfo;
            }

			// 是否是用户自己的页面
			function isSelfPage() {
				if (!isUserExist() || isEmptyObject(currentPage) || $scope.user.username != currentPage.username) {
					return false;
				}
				return true;
			}

            //初始化，读取用户站点列表及页面列表
            function init() {
                //console.log('---------------init---------------');
                var otherUsername = storage.sessionStorageGetItem('otherUsername');
                var fnList = [];
                if (!Account.ensureAuthenticated() && !otherUsername) {
                    return;
                }
                initEditor();

				//console.log(otherUsername);

				var callback = function() {

				}
                // 获取自己用户信息
                fnList.push(function (finish) {
                   Account.getUser(function (userinfo) {
                       $scope.user = userinfo;
                       finish && finish();
                   }, finish);
                });
                // 获取他人用户信息
                fnList.push(function (finish) {
                    if (otherUsername && (!$scope.user || $scope.user.username != otherUsername)) {
                        util.post(config.apiUrlPrefix + 'user/getByName', {username:otherUsername}, function (data) {
                            otherUserinfo = data;
                            finish && finish();
                        }, finish);
                    } else {
                        finish && finish();
                    }
                });

                util.batchRun(fnList, function () {
                    $rootScope.userinfo = otherUserinfo || $scope.user;
                    if (otherUserinfo && otherUserinfo.dataSource && (!$scope.user || $scope.user.username != otherUserinfo.username)) {
						if ($scope.user) {
							for (var i=0; i < otherUserinfo.dataSource.length; i++) {
								var ds1 = otherUserinfo.dataSource[i];
								for (var j = 0; j < $scope.user.dataSource.length; j++) {
									var ds2 = $scope.user.dataSource[j];
									if (ds1.apiBaseUrl == ds2.apiBaseUrl) {
										ds1.dataSourceToken = ds2.dataSourceToken;
										ds1.isInited = true;
									}
								}
							} 
						}
                        var userDataSource = dataSource.getUserDataSource(otherUserinfo.username);
                        userDataSource.init(otherUserinfo.dataSource, otherUserinfo.defaultDataSourceSitename);
                    }
                    loadSitePageInfo();
                });
                // // 获取站点及页列表
                // Account.getUser(function (userinfo) {
                //     $scope.user = userinfo;
                //     $rootScope.userinfo = userinfo;
                //     if (urlObj && userinfo.username != urlObj.username) {
                //         util.post(config.apiUrlPrefix + 'user/getByName', {username:urlObj.username}, function (data) {
                //            otherUserinfo = data;
                //            if (otherUserinfo && otherUserinfo.dataSource) {
                //                var userDataSource = dataSource.getUserDataSource(otherUserinfo.username);
                //                userDataSource.init(otherUserinfo.dataSource, otherUserinfo.dataSourceId);
                //            }
                //         });
                //     }
                //     loadSitePageInfo();
                // });
            }

            $scope.$watch('$viewContentLoaded', init);
            //init();

            // 保存页
            function savePageContent(cb, errcb) {
                //console.log(currentPage);
                // 不能修改别人页面
                if (!isUserExist() || isEmptyObject(currentPage) || !currentPage.isModify) {
                    cb && cb();
                    return;
                }

                var currentDataSource = getCurrentDataSource();
                var page = angular.copy(currentPage);
                var content = editor.getValue();
                var saveFailedCB = function () {
                    page.content = content;
                    page.isModify = true;
                    storage.indexedDBSetItem(config.pageStoreName, page);
                    console.log("---------save failed-------");
                    errcb && errcb();
                };
                var saveSuccessCB = function () {
                    page.content = content;
                    page.isModify = false;
					page.isConflict = false;
					page.blobId = undefined;
                    storage.indexedDBSetItem(config.pageStoreName, page);
					storage.sessionStorageRemoveItem(page.url);
                    indexDBDeletePage(page.url, true);
                    console.log("---------save success-------");
                    cb && cb();
                };

                currentSite = getCurrentWebsite(page.username, page.sitename);
                if (currentSite) {
                    util.post(config.apiUrlPrefix + 'website/updateWebsitePageinfo', {userId:currentSite.userId, siteId:currentSite._id});
                }

                currentDataSource.writeFile({
                    path: page.url + pageSuffixName,
                    content: content
                }, saveSuccessCB, saveFailedCB);
            }

            function getCurrentWebsite(username, sitename) {
                if (!isEmptyObject(currentPage)) {
                    username = username || currentPage.username;
                    sitename = sitename || currentPage.sitename;
                }

                if (!username || !sitename)
                    return null;

                for (var i = 0; i < allWebsites.length; i++) {
                    if (allWebsites[i].username == username && allWebsites[i].name == sitename) {
                        return allWebsites[i];
                    }
                }
                return null;
            }

            // 获得指定页
            function getPageByUrl(url) {
                return allPageMap[url];
            }

            $scope.$on("changeEditorPage", function (event, urlObj) {
                renderAutoSave(function () {
                    openUrlPage(urlObj);
                }, function () {
                    openUrlPage(urlObj);
                });
            });

            // 获取站点文件列表
            function getSitePageList(params, cb, errcb) {
				//console.log(params);
                var currentDataSource = dataSource.getDataSource(params.username, params.sitename);
                if (!currentDataSource) {
                    console.log("current data source unset!!!");
                    return;
                }

                if (!pagelistMap[params.path]) {
                    currentDataSource.getTree({recursive:true, path: params.path},function (data) {
                        for (var i = 0; i < data.length; i++) {
                            if (!allPageMap[data[i].url]) {
                                allPageMap[data[i].url] = data[i];
							} else {
								var page = allPageMap[data[i].url];
								if (!page.blobId) {
									page.blobId = data[i].blobId;
								} else {
									if (page.blobId != data[i].blobId) {
										page.newBlobId = data[i].blobId;
										page.isConflict = true;
									}
								}
							}
                        }
                        //console.log(allPageMap);
                        pagelistMap[params.path] = data;
                        initTree();
                        cb && cb();
                    },function () {
                        console.log("get pagelist failed!!!");
                        errcb && errcb();
                    });
                } else {
                    cb && cb();
                }
            }

            var openTempFile = function () {
                var tempContent = storage.localStorageGetItem("wikiEditorTempContent") || "edit temp file";
                editor.setValue(tempContent);
                storage.localStorageRemoveItem("wikiEditorTempContent");

                currentPage = undefined;
                $('#btUrl').val("temp file");
            }

            // 打开url页
            function openUrlPage(urlObj) {
                urlObj = urlObj || storage.sessionStorageGetItem('urlObj') || {};
                storage.sessionStorageRemoveItem('urlObj');
                console.log(urlObj);

                var username = urlObj.username;
                var sitename = urlObj.sitename;
                var pagename = urlObj.pagename || 'index';
                var pagepath = urlObj.pagepath || ('/' + username + '/' + sitename + '/' + pagename);
                var url = urlObj.url || pagepath;
                if (!username || !sitename) {
                    openTempFile();
                    return;
                }
                currentPage = getPageByUrl(url);
                currentSite = getCurrentWebsite(username, sitename);
				
                var _openUrlPage = function () {
                    var url = '/' + urlObj.username + '/' + urlObj.sitename + '/' + (urlObj.pagename || 'index');
                    currentPage = getPageByUrl(url);
                    //console.log(url, pagepath, urlObj);
                    if (currentPage) {
                        currentSite = getCurrentWebsite();
                        openPage();
                        return;
                    }
					// 访问其它人不存在页面不新建
					if (username != $scope.user.username) {
						openTempFile();
						return;
					}
                    // 不存在 不新建
                    //if (!currentPage && pagename[0] != '_') {
                    //    var url = '/' + username + '/' + sitename;
                    //    for (var key in allPageMap) {
                    //        if (key.indexOf(url) >= 0) {
                    //            currentPage = allPageMap[key];
                    //            currentSite = getCurrentWebsite();
                    //            openPage();
                    //            return;
                    //        }
                    //    }

                    //    if (!currentPage) {
                    //        openTempFile();
                    //        return;
                    //    }
                    //}

                    // 新建
                    var page = {};
                    page.url = url;
                    page.username = username;
                    page.sitename = sitename;
                    page.pagename = pagename;
                    page.isModify = true;
                    currentPage = page;
                    currentSite = getCurrentWebsite();
                    //console.log(currentPage);
                    allPageMap[page.url] = page;
                    allWebstePageContent[page.url] = "";
                    initTree();
                    openPage();
                }

                // 获取站点页列表
                getSitePageList({path:"/" + username + '/' +  sitename, username:username, sitename:sitename}, function () {
                    _openUrlPage();
                });
            }

            // 打开页
            function openPage() {
                //console.log(currentPage);
                if (!currentPage) {
                    var urlObj=storage.sessionStorageGetItem('urlObj') || {};
                    $scope.opens[urlObj.url]={
                        pageNode:
                            {
                                name:urlObj.pagename,
                                sitename:urlObj.sitename,
                                url:urlObj.url,
                                isLeaf:true
                            },
                        selected:true,
                        itemId:urlObj.url.split("/").join("")
                    };
                    openUrlPage();
                    return;
                }

                //console.log(currentPage);
                // 设置全局用户页信息和站点信息
                $rootScope.userinfo = getUserinfo(currentPage.username);
                $rootScope.siteinfo = currentSite;
                $rootScope.pageinfo = currentPage;
                $rootScope.tplinfo = getPageByUrl('/' + currentPage.username + '/' + currentPage.sitename + '/_theme');
                // 保存正在编辑的页面urlObj
                storage.sessionStorageSetItem('urlObj', {
                    username: currentPage.username,
                    sitename: currentPage.sitename,
                    pagepath: currentPage.pagepath,
                    pagename: currentPage.pagename,
                    url:currentPage.url,
                });
                !config.islocalWinEnv() && $location.path(currentPage.url);

                function setEditorValue(content) {
                    currentPage.isFirstEditor = true;
                    //console.log(currentPage);
                    if (!editorDocMap[currentPage.url]) {
                        editorDocMap[currentPage.url] = CodeMirror.Doc(content, 'markdown');
                    }
                    editor.swapDoc(editorDocMap[currentPage.url]);
                    //console.log(currentPage);
					editor.setValue(content);
                    allWebstePageContent[currentPage.url] = editor.getValue();
                    CodeMirror.signal(editor, 'change', editor);

                    // 折叠wiki命令
                    for (var i = editor.firstLine(), e = editor.lastLine(); i <= e; i++) {
                        var lineValue = editor.getLine(i);
                        if (lineValue.indexOf('```@') == 0 || lineValue.indexOf('```/') == 0) {
                            editor.foldCode(CodeMirror.Pos(i, 0), null, "fold");
                        }
                    }

					// init tree user settimeout(function(){}, 0)
					setTimeout(function() {
						$('#btUrl').val(window.location.origin + currentPage.url);
						var treeNode = treeNodeMap[currentPage.url];
						var treeid = getTreeId(currentPage.username);
						//console.log(treeid, treeNodeMap, currentPage);
						if (treeNode) {
							$(treeid).treeview('selectNode', [treeNode.nodeId, {silent: true}]);
							while (treeNode.parentId != undefined){
								treeNode = $(treeid).treeview('getNode', treeNode.parentId);
								if (!treeNode.state.expanded) {
									$(treeid).treeview('expandNode', [treeNode, {levels: 1, silent: false}]);
								}
							};
						}
					}, 10);
                }

                dataSource.getUserDataSource($scope.user.username).registerInitFinishCallback(function () {
                    getCurrentPageContent(function (data) {
                        //console.log(data);
                        allWebstePageContent[currentPage.url] = data;
                        setEditorValue(data || "");
                    }, function () {
                        if (isEmptyObject(currentPage)) {
                            openTempFile();
                            return;
                        }
                        allWebstePageContent[currentPage.url] = "";
                        setEditorValue("");
                    });
                });

                // storage.indexedDBGetItem(config.pageStoreName, currentPage.url, function (page) {
                //     if (page) {
                //         page.timestamp = page.timestamp || 0;
                //         currentPage.timestamp = currentPage.timestamp || 0; // (new Date()).getTime();
                //         if (page.timestamp > currentPage.timestamp &&  currentPage.content != page.content) {
                //             console.log("---------------histroy modify---------------");
                //             currentPage.content = page.content;
                //             currentPage.isModify = true;
                //             initTree();
                //         }
                //     }
                //     setEditorValue();
                // }, function () {
                //     setEditorValue();
                // });
            }

            // 获得页面内容
            function getCurrentPageContent(cb, errcb) {
                if (isEmptyObject(currentPage)) {
                    errcb && errcb();
                    return;
                }
                //console.log(allWebstePageContent);
                var url = currentPage.url;
                //console.log("-----------getPageContent-------------", url, currentPage, allWebstePageContent);
                if (allWebstePageContent[url] != undefined) {
                    //console.log(allWebstePageContent[url]);
                    cb && cb(allWebstePageContent[url]);
                } else {
                    var currentDataSource = getCurrentDataSource();
                    //console.log(currentDataSource);
                    if (currentDataSource) {
                        currentDataSource.getRawContent({path: url + pageSuffixName}, function (data) {
                            //console.log(data);
                            cb && cb(data);
                        }, errcb);
                    } else {
                        console.log("----------data source uninit-------------");
                        errcb && errcb();
                    }
                }
            }

            //初始化目录树  data:  $.parseJSON(getTree()),
            function initTree() {
                //console.log('@initTree');
                setTimeout(function () {
                    var isFirstCollapsedAll = true;
                    var treeview = {
                        color: "#3977AD",
                        selectedBackColor: "#3977AD",
                        onhoverColor:"#D6D6D6",
                        showBorder: false,
                        enableLinks: false,
                        levels: 4,
                        showTags: true,
                        //data: getTreeData($scope.user.username, allPageMap, false),
                        onNodeSelected: function (event, data) {
                            //console.log(data.pageNode);
                            //console.log("---------onNodeSelected----------");
                            var treeid = getTreeId(data.pageNode.username);
                            if (data.pageNode.isLeaf) {
                                if (currentPage && data.pageNode.url != currentPage.url) {
                                    $(getTreeId(currentPage.username)).treeview('unselectNode', [treeNodeMap[currentPage.url].nodeId, {silent: true}]);
                                }

                                //取消当前已选择
                                var nowActive=$("#openedTree .node-selected");
                                // $scope.opens[nowActive.dataset.url].selected=false;
                                nowActive.removeClass("node-selected");
                                //选中新打开项
                                var itemId=data.pageNode.url.split("/").join("");
                                if ($scope.opens[data.pageNode.url]){//已打开过的手动激活选中状态
                                    $("#"+itemId).addClass("node-selected");
                                }
                                $scope.opens[data.pageNode.url]=data;
                                $scope.opens[data.pageNode.url].selected=true;
                                $scope.opens[data.pageNode.url].itemId=itemId;
                            } else {
                                $(treeid).treeview('unselectNode', [data.nodeId, {silent: true}]);
                                $(treeid).treeview('toggleNodeExpanded', [ data.nodeId, { silent: true } ]);
                                if (treeNodeExpandedMap[data.pageNode.url]) {
                                    treeNodeExpandedMap[data.pageNode.url] = false;
                                } else {
                                    treeNodeExpandedMap[data.pageNode.url] = true;
                                }
                                getSitePageList({path:data.pageNode.url, username:data.pageNode.username, sitename:data.pageNode.sitename});
                                //console.log("--------------");
                            }
                            renderAutoSave(function () {
                                if (data.pageNode.isLeaf) {
                                    //console.log("--------------------auto save--------------------");
                                    if (!currentPage || currentPage.url != data.pageNode.url) {
                                        currentPage = getPageByUrl(data.pageNode.url);
                                        currentSite = getCurrentWebsite();
                                        openPage();
                                    }
                                    editor.focus();
                                }
                            }, function () {
                                Message.warning("自动保存失败");
                                openPage();
                            });
                        },
                        onNodeUnselected: function (event, data) {
                            // 不取消自己
                            //console.log("---------onNodeUnselected----------");
                            var treeid = getTreeId(data.pageNode.username);
                            if (currentPage && data.pageNode.url == currentPage.url) {
                                $(treeid).treeview('selectNode', [treeNodeMap[currentPage.url].nodeId, {silent: true}]);
                            }
                        },
                        onNodeCollapsed: function (event, data) {
                            //console.log("node collapsed", data.pageNode.url);
                            treeNodeMap[data.pageNode.url] = data;
                            if (!isFirstCollapsedAll) {
                                delete treeNodeExpandedMap[data.pageNode.url];
                                //console.log(treeNodeExpandedMap);
                            }
                            for (var i = 0; data.nodes && i < data.nodes.length; i++) {
                                var node = data.nodes[i];
                                treeNodeMap[node.pageNode.url] = node;
                            }
                            //console.log("------------------");
                        },
                        onNodeExpanded: function (event, data) {
                            //console.log(treeNodeExpandedMap);
                            //console.log("node expand",data.pageNode.url);
                            treeNodeExpandedMap[data.pageNode.url] = true;
                            getSitePageList({path:data.pageNode.url, username:data.pageNode.username, sitename:data.pageNode.sitename});
                        },
                    };
                    if (isUserExist()) {
                        var mytree = angular.copy(treeview);
                        mytree.data = getTreeData($scope.user.username, allPageMap, false);
                        $('#mytree').treeview(mytree);
                        $('#mytree').treeview('collapseAll', {silent: false});
                    }
                    if (isOtherUserExist()) {
                        var othertree = angular.copy(treeview);
                        othertree.data = getTreeData(otherUserinfo.username, allPageMap, false);
                        $('#othertree').treeview(othertree);
                        $('#othertree').treeview('collapseAll', {silent: false});
                    }
					//console.log(treeNodeMap);
                    isFirstCollapsedAll = false;
                    for (var key in treeNodeExpandedMap) {
						var node = treeNodeMap[key]
                        //console.log(key, treeNodeMap[key]);
                        var treeid = getTreeId(node.pageNode.username);
                        treeNodeMap[key] && $(treeid).treeview('expandNode', [treeNodeMap[key].nodeId, {levels: 1, silent: true}]);
                    }
                });
            }

            //命令处理函数
            function command() {
                var strCmd = $location.$$path;
                var arrCmd = strCmd.split('_');
                var cmd = '';
                for (var i = 0; i < arrCmd.length; i++) {
                    cmd = arrCmd[i];
                    if (cmd.substr(0, 1) == '&') {
                        switch (cmd.substring(1)) {
                            case 'new':
                                console.log('command:new');
                                break;
                            case 'ws':
                                console.log('command:ws');
                                break;
                            default:
                                console.log('command:undefined!' + cmd);
                                break;
                        }
                    }
                }
                return;
            }

            //已打开列表树中打开网页编辑
            $scope.openPageTree = function (data) {
                renderAutoSave(function () {
                    if (data.pageNode.isLeaf) {
                        //console.log("--------------------auto save--------------------");
                        if (!currentPage || currentPage.url != data.pageNode.url) {
                            currentPage = getPageByUrl(data.pageNode.url);
                            currentSite = getCurrentWebsite();
                            openPage();
                        }
                        editor.focus();
                    }
                }, function () {
                    Message.warning("自动保存失败");
                    openPage();
                });
                $("#openedTree .node-selected").removeClass("node-selected");
                $("#"+data.itemId).addClass("node-selected");
            };

            $scope.openWikiBlock = function () {
                function formatWikiCmd(text) {
                    var lines = text.split('\n');
                    var startPos = undefined, endPos = undefined;
                    for (var i = 0; i < lines.length; i++) {
                        lines[i] = lines[i].replace(/^[\s]*/, '');
                        if (lines[i].indexOf('```') == 0) {
                            if (startPos == undefined) {
                                startPos = i;
                            } else {
                                endPos = i;
                            }
                        }
                    }
                    if (startPos == undefined || endPos == undefined)
                        return text;

                    var paramLines = lines.slice(startPos + 1, endPos);
                    try {
                        //console.log(paramLines);
                        var paramsText = paramLines.join('\n');
                        var newText = lines.slice(0, startPos + 1).join('\n') + '\n' + lines.slice(endPos).join('\n');
                        if (paramsText) {
                            var paramObj = angular.fromJson(paramsText);
                            paramsText = angular.toJson(paramObj, 4);
                            newText = lines.slice(0, startPos + 1).join('\n') + '\n' + paramsText + '\n' + lines.slice(endPos).join('\n');
                        }
                        return newText;
                    } catch (e) {
                        console.log(e);
                        return lines.slice(0, startPos + 1).join('\n') + '\n' + lines.slice(endPos).join('\n');
                    }
                }

                //console.log('openWikiBlock');
                modal('controller/wikiBlockController', {
                    controller: 'wikiBlockController',
                    size: 'lg'
                }, function (wikiBlock) {
                    //console.log(result);
                    var wikiBlockContent = formatWikiCmd(wikiBlock.content);
                    var cursor = editor.getCursor();
                    var content = editor.getLine(cursor.line);
                    console.log(content);
                    if (content.length > 0) {
                        wikiBlockContent = '\n' + wikiBlockContent;
                    }
                    editor.replaceSelection(wikiBlockContent);
                }, function (result) {
                    console.log(result);
                });
            }

            $scope.openGitFile = function () {
                if (!currentPage || !currentPage.url) {
                    return;
                }

                var currentDataSource = getCurrentDataSource();
                if (currentDataSource) {
                    if (currentDataSource.getDataSourceType() == "github") {
                        currentDataSource.getFile({path: currentPage.url + pageSuffixName}, function (data) {
                            //console.log(data);
                            window.open(data.html_url);
                        });
                    } else {
                        window.open(currentDataSource.getContentUrlPrefix({path: currentPage.url + pageSuffixName, sha:"master"}));
                    }
                }
            }

            $scope.cmd_newpage = function (hidePageTree) {
                $scope.hidePageTree=hidePageTree ? true : false;
                var nodeid=event.target.parentNode.parentNode.dataset.nodeid;
                if (hidePageTree){
                    $scope.nowHoverPage={
                        sitename:$("#mytree").treeview("getNode",nodeid).pageNode.sitename,
                        username:$scope.user.username
                    };
                }
                function openNewPage() {
                    $uibModal.open({
                        //templateUrl: WIKI_WEBROOT+ "html/editorNewPage.html",   // WIKI_WEBROOT 为后端变量前端不能用
                        templateUrl: config.htmlPath + "editorNewPage.html",
                        controller: "pageCtrl",
                        scope: $scope
                    }).result.then(function (provider) {
                        //console.log(provider);
                        if (provider == "page") {
                            console.log(currentPage);
                            allPageMap[currentPage.url] = currentPage;
                            currentSite = getCurrentWebsite();
                            initTree();
                            openPage(false);
                        }
                    }, function (text, error) {
                        return;
                    });
                }

                savePageContent(function () {
                    //Message.warning("自动保存成功");
                    openNewPage();
                }, function () {
                    Message.warning("自动保存失败");
                    openNewPage();
                });

            }

            //保存页面
            $scope.cmd_savepage = function (cb, errcb) {
                if (!isEmptyObject(currentPage)) {//修改
                    var _currentPage = currentPage;    // 防止保存过程中 currentPage变量被修改导致保存错误
                    savePageContent(function () {
                        _currentPage.isModify = false;
						_currentPage.isConflict = false;
						_currentPage.blobId = undefined;
                        initTree();
                        cb && cb();
                        Message.info("文件保存成功");
                    }, function () {
                        errcb && errcb();
                        Message.info("文件保存失败");
                    });
                } else {
                    storage.localStorageSetItem("wikiEditorTempContent", editor.getValue());
                    // $uibModal.open({
                    //     //templateUrl: WIKI_WEBROOT+ "html/editorNewPage.html",   // WIKI_WEBROOT 为后端变量前端不能用
                    //     templateUrl: config.htmlPath + "editorNewPage.html",
                    //     controller: "pageCtrl",
                    // }).result.then(function (provider) {
                    //     //console.log(provider);
                    //     if (provider == "page") {
                    //         //console.log(currentPage);
                    //         allPageMap[currentPage.url] = currentPage;
                    //         allWebstePageContent[currentPage.url] = editor.getValue();
                    //         $scope.cmd_savepage(function () {
                    //             openPage();
                    //             storage.localStorageRemoveItem("wikiEditorTempContent");
                    //         });
                    //     }
                    // }, function (text, error) {
                    //     return;
                    // });
                }
            }

            //删除
            $scope.cmd_remove = function (confirmed) {
                if (!confirmed){
                    $('#deleteModal').modal("show");
                }else{
                    if (!isEmptyObject(currentPage)) {
                        currentSite = getCurrentWebsite(currentPage.username, currentPage.sitename);
                        var currentDataSource = getCurrentDataSource();

                        currentDataSource && currentDataSource.deleteFile({path: currentPage.url + pageSuffixName}, function () {
                            console.log("删除文件成功:");
                        }, function (response) {
                            console.log("删除文件失败:");
                        });

                        storage.indexedDBDeleteItem(config.pageStoreName, currentPage.url);

                        delete allPageMap[currentPage.url];
                        storage.sessionStorageRemoveItem('urlObj');
                        currentPage = undefined;
                        $('#deleteModal').modal("hide");
                        initTree();
                        openPage();
                    }
                }
            }

            //关闭
            $scope.cmd_close = function () {
                Message.info("关闭功能开发中");
            };

            //关闭全部已打开
            $scope.cmd_closeAll = function () {
                Message.info("关闭功能开发中");
            };

            //刷新
            $scope.cmd_refresh = function (url) {
				var page = getPageByUrl(url);
				//console.log(page);
				if (!page) {
					return ;
				}
				var siteDataSource = dataSource.getDataSource(page.username, page.sitename);
				if (!siteDataSource){
					return ;
				}
				siteDataSource.getRawContent({path:currentPage.url + pageSuffixName}, function (data) {
					allWebstePageContent[currentPage.url] = data || "";
					//console.log(data, currentPage);
					page.isConflict = false;
					page.blobId = undefined;
					initTree();
					if (!isEmptyObject(currentPage) && url == currentPage.url) {
						//console.log("---------");
						openPage();
					}
				});
            };

            //新建文件夹
            $scope.cmd_newFile = function () {
                Message.info("新建文件夹功能开发中");
            };

            //撤销
            $scope.cmd_undo = function () {
                if (isHTMLViewEditor) {
                    formatHtmlView('undo');
                    return;
                }
                editor.undo();
                editor.focus();
            }

            //重做
            $scope.cmd_redo = function () {
                if (isHTMLViewEditor) {
                    formatHtmlView('redo');
                    return;
                }
                editor.redo();
                editor.focus();
            }

            //查找
            $scope.cmd_find = function () {
                editor.execCommand("find");
                CodeMirror.commands.find(editor);
            }

            //替换
            $scope.cmd_replace = function () {
                editor.execCommand("replace");
                CodeMirror.commands.replace(editor);
            }

            //标题    H1：Hn
            $scope.cmd_headline = function (level) {
                if (isHTMLViewEditor) {
                    formatHtmlView("formatblock", 'H' + level);
                    return;
                }
                var preChar = '';
                while (level > 0) {
                    preChar += '#';
                    level--;
                }
                preChar += ' ';

                var cursor = editor.getCursor();
                var content = editor.getLine(cursor.line);

                var iSpace = 0;
                var chrCmp = '';
                for (var i = 0; i < content.length; i++) {
                    chrCmp = content.substr(i, 1);
                    if (chrCmp == '#') {
                        continue;
                    } else {
                        if (chrCmp == ' ') {
                            iSpace = i + 1;
                        }
                        break;
                    }
                }
                editor.replaceRange(preChar, CodeMirror.Pos(cursor.line, 0), CodeMirror.Pos(cursor.line, iSpace));
                editor.focus();
                return;
            }

            function font_style(char) {
                if (editor.somethingSelected()) {
                    var sel = editor.getSelection();
                    var desStr = char + sel.replace(/\n/g, char + "\n" + char) + char;
                    editor.replaceSelection(desStr);
                } else {
                    var cursor = editor.getCursor();
                    var content = editor.getLine(cursor.line);

                    editor.replaceRange(char, CodeMirror.Pos(cursor.line, content.length), CodeMirror.Pos(cursor.line, content.length));
                    editor.replaceRange(char, CodeMirror.Pos(cursor.line, 0), CodeMirror.Pos(cursor.line, 0));

                    editor.setCursor(CodeMirror.Pos(cursor.line, content.length + char.length));
                }
                editor.focus();
            }

            //加粗
            $scope.cmd_bold = function () {
                //console.log(isHTMLViewEditor);
                if (isHTMLViewEditor) {
                    formatHtmlView('bold');
                    return;
                }
                font_style('**');
            }

            //斜体
            $scope.cmd_italic = function () {
                if (isHTMLViewEditor) {
                    formatHtmlView('italic');
                    return;
                }
                font_style('*');
            }

            //下划线
            $scope.cmd_underline = function () {
                if (isHTMLViewEditor) {
                    formatHtmlView('underline');
                    return;
                }
            }

            //下划线
            $scope.cmd_strikethrough = function () {
                if (isHTMLViewEditor) {
                    formatHtmlView('strikethrough');
                    return;
                }
                font_style('~~');
            }

            //上标
            $scope.cmd_superscript = function () {
                if (isHTMLViewEditor) {
                    formatHtmlView('superscript');
                    return;
                }
                font_style('^');
            }

            //下标
            $scope.cmd_subscript = function () {
                if (isHTMLViewEditor) {
                    formatHtmlView('subscript');
                    return;
                }
                font_style('~');
            }

            //有序列表
            $scope.cmd_listol = function () {
                if (isHTMLViewEditor) {
                    formatHtmlView('insertorderedlist');
                    return;
                }

                if (editor.somethingSelected()) {
                    var sel = editor.getSelection();
                    var srcStr = '~ol~' + sel.replace(/\n/g, "\n~ol~");

                    var id = 1;
                    var desStr = srcStr.replace("~ol~", id + '. ');
                    while (desStr.indexOf("~ol~") >= 0) {
                        id++;
                        desStr = desStr.replace("~ol~", id + '. ');
                    }

                    editor.replaceSelection(desStr);
                } else {
                    var cursor = editor.getCursor();
                    editor.replaceRange('1. ', CodeMirror.Pos(cursor.line, 0), CodeMirror.Pos(cursor.line, 0));
                }
                editor.focus();
            }

            //行首关键字
            function hol_keyword(char) {
                if (editor.somethingSelected()) {
                    var sel = editor.getSelection();
                    var desStr = char + sel.replace(/\n/g, "\n" + char);
                    editor.replaceSelection(desStr);
                } else {
                    var cursor = editor.getCursor();
                    editor.replaceRange(char, CodeMirror.Pos(cursor.line, 0), CodeMirror.Pos(cursor.line, 0));
                }
                editor.focus();
            }

            //整行替换
            function line_keyword(lineNo, char, ch) {
                var content = editor.getLine(lineNo);
                editor.replaceRange(char, CodeMirror.Pos(lineNo, 0), CodeMirror.Pos(lineNo, content.length));
                if (!ch) {
                    ch = 0;
                }
                editor.setCursor(CodeMirror.Pos(lineNo, ch));
                editor.focus();
            }

            //无序列表
            $scope.cmd_listul = function () {
                if (isHTMLViewEditor) {
                    formatHtmlView('insertunorderedlist');
                    return;
                }
                hol_keyword('- ');
            }

            //引用内容
            $scope.cmd_blockqote = function () {
                if (isHTMLViewEditor) {
                    formatHtmlView('formatblock', 'blockquote');
                    return;
                }

                hol_keyword('> ');
            }

            //表格
            $scope.cmd_tabel = function () {
                $uibModal.open({
                    templateUrl: config.htmlPath + "editorInsertTable.html",
                    controller: "tableCtrl",
                }).result.then(function (provider) {
                    //console.log(provider);
                    if (provider == "table") {
                        var table = $rootScope.table;
                        //console.log(table);
                        //| 0:0 | 1:0 |
                        //| -- | -- |
                        //| 0:2 | 1:2 |
                        var wiki = '';
                        for (var i = 0; i < table.rows; i++) {
                            wiki += '\n';
                            if (i == 1) {
                                for (var j = 0; j < table.cols; j++) {
                                    switch (table.alignment) {
                                        case 1:
                                            wiki += '|:-- ';
                                            break;
                                        case 2:
                                            wiki += '|:--:';
                                            break;
                                        case 3:
                                            wiki += '| --:';
                                            break;
                                        default:
                                            wiki += '| -- ';
                                            break;
                                    }
                                }
                                wiki += '|\n';
                            }

                            for (var j = 0; j < table.cols; j++) {
                                wiki += '| ' + j + ':' + i + ' ';
                            }
                            wiki += '|';
                        }
                        wiki += '\n';

                        var cursor = editor.getCursor();
                        var content = editor.getLine(cursor.line);
                        if (content.length > 0) {
                            wiki += '\n';
                        }

                        editor.replaceRange(wiki, CodeMirror.Pos(cursor.line + 1, 0), CodeMirror.Pos(cursor.line + 1, 0));
                        editor.setCursor(CodeMirror.Pos(cursor.line + 1, 0));
                        editor.focus();
                    }
                }, function (text, error) {
                    console.log('text:' + text);
                    console.log('error:' + error);
                    return;
                });
            }

            //水平分割线
            $scope.cmd_horizontal = function () {
                var cursor = editor.getCursor();
                editor.replaceRange('---\n', CodeMirror.Pos(cursor.line + 1, 0), CodeMirror.Pos(cursor.line + 1, 0));
                editor.setCursor(CodeMirror.Pos(cursor.line + 2, 0));
                editor.focus();
            }

            //链接
            $scope.cmd_link = function () {
                $uibModal.open({
                    templateUrl: config.htmlPath + "editorInsertLink.html",
                    controller: "linkCtrl",
                }).result.then(function (provider) {
                    if (provider == "link") {
                        var link = $rootScope.link;
                        var wiki = '';
                        /*
                         if (isHTMLViewEditor) {
                         formatHtmlView('createlink', link);
                         return;
                         }
                         */
                        if (editor.somethingSelected()) {
                            wiki += '[' + editor.getSelection() + ']';
                        } else {
                            wiki += '[]';
                        }

                        // wiki += '(' + link.url + ')';
                        editor.replaceSelection(wiki + '(' + link.url + ')');
                        if (wiki == '[]') {
                            editor.setCursor(CodeMirror.Pos(editor.getCursor().line, 1));
                        }
                        editor.focus();
                    }
                }, function (text, error) {
                    console.log('text:' + text);
                    console.log('error:' + error);
                    return;
                });
            }

            //图片
            $scope.cmd_image = function () {
                $uibModal.open({
                    templateUrl: config.htmlPath + "editorInsertImg.html",
                    controller: "imgCtrl",
                }).result.then(function (provider) {
                    console.log(provider);
                    if (provider == "img") {
                        var url = $rootScope.img.url;
                        var txt = $rootScope.img.txt;
                        var dat = $rootScope.img.dat;
                        var nam = $rootScope.img.nam;

                        var wiki = '';
                        if (txt) {
                            wiki += '![' + txt + ']';
                        } else if (editor.somethingSelected()) {
                            wiki += '![' + editor.getSelection() + ']';
                        } else {
                            wiki += '![]';
                        }

                        if (url) {
                            wiki += '(' + url + ')';
                        } else {
                            wiki += '(' + dat + ')';

                        }

                        editor.replaceSelection(wiki);
                        editor.focus();
                    }
                }, function (text, error) {
                    console.log('text:' + text);
                    console.log('error:' + error);
                    return;
                });
            }

            //视频
            $scope.cmd_video=function () {
                $uibModal.open({
                    templateUrl: config.htmlPath + "editorInsertVideo.html",
                    controller: "videoCtrl",
                }).result.then(function (result) {
                    if (result) {
                        var videoContent = '```@wiki/js/video\n{\n\t"videoUrl":"'+ result + '"\n}\n```';
                        editor.replaceSelection(videoContent);
                        editor.focus();
                    }
                });
            }

            /**
             * dataURL to blob, ref to https://gist.github.com/fupslot/5015897
             * @param dataURI
             * @returns {Blob}
             */
            function dataURItoBlob(dataURI) {
                var byteString = atob(dataURI.split(',')[1]);
                var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
                var ab = new ArrayBuffer(byteString.length);
                var ia = new Uint8Array(ab);
                for (var i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                return new Blob([ab], {type: mimeString});
            }

            //图片上传
            $scope.cmd_image_upload = function (fileObj, cb) {
                if (!/image\/\w+/.test(fileObj.type)) {
                    alert("这不是图片！");
                    return false;
                }

                var currentDataSource = getCurrentDataSource();
                if (!currentDataSource) {
                    alert('数据源服务失效，图片无法上传');
                } else {
                    //支持chrome IE10
                    if (window.FileReader) {
                        var fileReader = new FileReader();
                        var cursor = editor.getCursor();
                        fileReader.onloadstart = function () {
                            console.log("onloadstart");
                            line_keyword(cursor.line, '***uploading...0/' + fileObj.size + ')***', 2);
                        };
                        fileReader.onprogress = function (p) {
                            console.log("onprogress");
                            line_keyword(cursor.line, '***uploading...' + p.loaded + '/' + fileObj.size + ')***', 2);
                        };
                        fileReader.onload = function () {
                            console.log("load complete");
                            line_keyword(cursor.line, '***uploading...' + fileObj.size + '/' + fileObj.size + ')***', 2);
                            currentDataSource.uploadImage({content: fileReader.result}, function (img_url) {
                                //console.log(img_url);
                                line_keyword(cursor.line, '![](' + img_url + ')', 2);
                                if (cb) {
                                    cb(img_url);
                                }
                            });
                        }
                        fileReader.readAsDataURL(fileObj);
                    } else {
                        alert('浏览器不支持');
                    }
                }
            }

            //代码
            $scope.cmd_code = function () {
                if (isHTMLViewEditor) {
                    formatHtmlView('formatblock', 'pre');
                    return;
                }

                var sel = editor.getSelection();
                var desStr = '```\n' + sel + '\n```';
                editor.replaceSelection(desStr);

                var cursor = editor.getCursor();
                editor.setCursor(CodeMirror.Pos(cursor.line - 1, cursor.ch));

                editor.focus();
            }

            //版本
            $scope.cmd_version = function () {
                // util.go("gitVersion");
                modal('controller/gitVersionController', {
                    controller: 'gitVersionController',
                    size: 'lg'
                }, function (wikiBlock) {
                    console.log(wikiBlock);
                }, function (result) {
                    console.log(result);
                });
            }

            $scope.cmd_transform = function () {
                $scope.enableTransform = !$scope.enableTransform;
                //console.log($scope.enableTransform);
                CodeMirror.signal(editor, 'change', editor);
            }


            // 渲染自动保存
            function renderAutoSave(cb, errcb) {
                var content = editor.getValue();
                if (isEmptyObject(currentPage)) {
                    storage.localStorageSetItem("wikiEditorTempContent", content);
                    cb && cb();
                    return;
                }

                if (!currentPage.isModify || !isSelfPage()) {
                    cb && cb();
                    return;
                }

				if (!currentPage.blobId) {
					currentPage.blobId = currentPage.newBlobId;
				} 

                currentPage.content = content;                             // 更新内容
                currentPage.timestamp = (new Date()).getTime();            // 更新时间戳
                //console.log(currentPage);
                //console.log('save storage ' + currentPage.url);
                storage.indexedDBSetItem(config.pageStoreName, currentPage, cb, errcb); // 每次改动本地保存
            }

            function initEditor() {
                //console.log("initEditor");
                if (editor || (!document.getElementById("source"))) {
                    console.log("init editor failed");
                    return;
                }

                function wikiCmdFold(cm, start) {
                    var line = cm.getLine(start.line);
                    if ((!line) || (!line.match(/^```[@\/]/)))
                        return undefined;
                    //console.log(start);
                    var end = start.line + 1;
                    var lastLineNo = cm.lastLine();
                    while (end < lastLineNo) {
                        line = cm.getLine(end)
                        if (line && line.match(/^```/))
                            break;
                        end++;
                    }

                    return {
                        from: CodeMirror.Pos(start.line),
                        to: CodeMirror.Pos(end, cm.getLine(end).length)
                    };
                }

                CodeMirror.registerHelper("fold", "wikiCmdFold", wikiCmdFold);

                editor = CodeMirror.fromTextArea(document.getElementById("source"), {
                    mode: 'markdown',
                    lineNumbers: true,
                    theme: "default",
                    viewportMargin: Infinity,
                    //绑定Vim
                    //keyMap:"vim",
                    //代码折叠
                    lineWrapping: true,

                    foldGutter: true,
                    foldOptions: {
                        rangeFinder: new CodeMirror.fold.combine(CodeMirror.fold.markdown, CodeMirror.fold.xml, CodeMirror.fold.wikiCmdFold),
                        clearOnEnter: false,
                    },
                    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
                    //全屏模式
                    //fullScreen:true,
                    //括号匹配
                    matchBrackets: true,
                    // lint: true,
                    extraKeys: {
                        "Alt-F": "findPersistent",
                        "Ctrl-F": "find",
                        "Ctrl-R": "replace",
                        "F11": function (cm) {
                            $rootScope.frameHeaderExist = !$rootScope.frameHeaderExist;
                            $rootScope.$apply();
                            //console.log($rootScope.frameHeaderExist);
                            cm.setOption("fullScreen", !cm.getOption("fullScreen"));
                        },
                        "Esc": function (cm) {
                            if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
                        },
                        "Ctrl-S": function (cm) {
                            $scope.cmd_savepage();
                        },
                        "Shift-Ctrl-N": function (cm) {
                            $scope.cmd_newpage();
                        },
                        "Ctrl-B": function (cm) {
                            $scope.cmd_bold();
                        },
                        "Ctrl-I": function (cm) {
                            $scope.cmd_italic();
                        },
                        "Ctrl--": function (cm) {
                            $scope.cmd_strikethrough();
                        },
                        "Shift-Ctrl-[": function (cm) {
                            $scope.cmd_superscript();
                        },
                        "Shift-Ctrl-]": function (cm) {
                            $scope.cmd_subscript();
                        },
                        "Shift-Ctrl-1": function (cm) {
                            $scope.cmd_headline(1);
                        },
                        "Shift-Ctrl-2": function (cm) {
                            $scope.cmd_headline(2);
                        },
                        "Shift-Ctrl-3": function (cm) {
                            $scope.cmd_headline(3);
                        },
                        "Shift-Ctrl-4": function (cm) {
                            $scope.cmd_headline(4);
                        },
                        "Shift-Ctrl-5": function (cm) {
                            $scope.cmd_headline(5);
                        },
                        "Shift-Ctrl-6": function (cm) {
                            $scope.cmd_headline(6);
                        },
                        "Ctrl-.": function (cm) {
                            $scope.cmd_listul();
                        },
                        "Ctrl-/": function (cm) {
                            $scope.cmd_listol();
                        },
                        "Ctrl-]": function (cm) {
                            $scope.cmd_blockqote();
                        },
                        "Shift-Ctrl-T": function (cm) {
                            $scope.cmd_tabel();
                        },
                        "Ctrl-H": function (cm) {
                            $scope.cmd_horizontal();
                        },
                        "Alt-L": function (cm) {
                            $scope.cmd_link();
                        },
                        "Alt-P": function (cm) {
                            $scope.cmd_image();
                        },
                        "Alt-C": function (cm) {
                            $scope.cmd_code();
                        },
                        "Ctrl-M": function (cm) {
                            $scope.openWikiBlock();
                        },
                    }
                });

                var viewEditorTimer = undefined;
                $('body').on('focus', '[contenteditable]', function () {
                    //console.log("start html view edit...");
                    isHTMLViewEditor = true;
                    currentRichTextObj = $(this);
                    if (viewEditorTimer) {
                        clearTimeout(viewEditorTimer);
                        viewEditorTimer = undefined;
                    }
                    //return $this;
                }).on('blur keyup paste input', '[contenteditable]', function () {
                    //return $this;
                }).on('blur', '[contenteditable]', function () {
                    //console.log("end html view edit...");
                    var $this = $(this);
                    viewEditorTimer = setTimeout(function () {
                        isHTMLViewEditor = false;
                        currentRichTextObj = undefined;
                        //console.log(mdwiki.blockList);
                        var blockList = mdwiki.blockList;
                        var block = undefined;
                        for (var i = 0; i < blockList.length; i++) {
                            if (blockList[i].blockCache.containerId == $this[0].id) {
                                block = blockList[i]
                            }
                        }
                        htmlToMd(block);
                    }, 1000);
                });

                mdwiki.setEditor(editor);

                var scrollTimer = undefined, changeTimer = undefined;
                var isScrollPreview = false;

                function htmlToMd(block) {
                    if (!block || !mdwiki.isEditor())
                        return;
                    var domNode = $('#' + block.blockCache.containerId)[0];
                    var mdText = toMarkdown(domNode.innerHTML, {
                        gfm: true, converters: [
                            {
                                filter: 'div',
                                replacement: function (content) {
                                    console.log(content);
                                    return '\n' + content + '\n';
                                }
                            }

                        ]
                    });
                    block.blockCache.domNode = undefined;
                    editor.replaceRange(mdText, {
                        line: block.textPosition.from,
                        ch: 0
                    }, {line: block.textPosition.to - 1});
                    //console.log(mdText, domNode, block.textPosition);
                }

                editor.on('fold', function (cm, from, to) {
                    cm.getDoc().addLineClass(from.line, 'wrap', 'CodeMirrorFold');
                    //console.log("--------------------fold--------------------");
                });
                editor.on('unfold', function (cm, from, to) {
                    //console.log("----------------unfold--------------------");
                    cm.getDoc().removeLineClass(from.line, 'wrap', 'CodeMirrorFold');
                });
                // 渲染后自动保存
                var renderTimer = undefined;
                editor.on("change", function (cm, changeObj) {
                    changeCallback(cm, changeObj);

                    if (currentPage && currentPage.url) {
                        allWebstePageContent[currentPage.url] = editor.getValue();
                    }

                    renderTimer && clearTimeout(renderTimer);
                    renderTimer = setTimeout(function () {
                        var text = editor.getValue();
                        mdwiki.render(text);
                        renderAutoSave();
                        resizeMod();
                        $scope.scaleSelect=$scope.scales[$scope.scales.length-1];

                        timer = undefined;
                    }, 100);
                });
                mdwiki.bindRenderContainer(".result-html");
                editor.focus();
                setEditorHeight();

                //previewWidth>=1200  =>  result-width=previewWidth
                //previewWidth<1200    =>  result-width=min(1200,winWidth)
                function getResultSize(winWidth,boxWidth) {
                    if(boxWidth<1200){
                        var resultSize=(winWidth>1200)? 1200 : winWidth;
                    }

                    return resultSize? resultSize:boxWidth;
                }

                function resizeResult(resultWidth) {
                    if(resultWidth){
                        $(".result-html").css("width", resultWidth + "px");
                    }
                }

                function getScaleSize(scroll) {
                    var winWidth = $(window).width();
                    var boxWidth = $("#preview").width();//30为#preview的padding宽度
                    var resultWidth=getResultSize(winWidth,boxWidth);
                    var scaleSize = boxWidth / resultWidth;

                    if(!scroll || scroll!="scroll"){
                        resizeResult(resultWidth);//设置result-html宽度

                        var len=$scope.scales.length-1;
                        if(!$scope.scales[len].resultWidth || $scope.scales[len].resultWidth != winWidth){//设置实际大小的result-html的宽度为浏览器窗口大小宽度
                            $scope.scales[len].resultWidth = winWidth;
                        }
                        if($scope.scales[len].showValue!="适合宽度"){
                            $scope.scales.push({
                                "id":$scope.scales.length,
                                "showValue":"适合宽度",
                                "scaleValue":scaleSize,
                                "special":true,
                                "resultWidth":resultWidth
                            });
                        }
                    }
                    return scaleSize;
                }

                function resizeMod(val,scaleItem) {
                    if (scaleItem && scaleItem.resultWidth){
                        resizeResult(scaleItem.resultWidth);
                    }
                    var scaleSize = val || getScaleSize();
                    $('#' + mdwiki.getMdWikiContainerId()).css({
                        "transform": "scale(" + scaleSize + ")",
                        "transform-origin": "left top"
                    });
                    if (scaleSize<=$scope.scales[0].scaleValue){//显示的最小比例时，禁用缩小按钮
                        $scope.forbidScale=true;
                        $scope.forbidEnlarge=false;
                    }else if(scaleSize>=$scope.scales[$scope.scales.length-3].scaleValue){//显示的最大比例时，禁用放大按钮
                        $scope.forbidEnlarge=true;
                        $scope.forbidScale=false;
                    }else{
                        $scope.forbidScale=false;
                        $scope.forbidEnlarge=false;
                    }
                }

                // 下拉框选择比例
                $scope.changeScale = function (scaleItem) {
                    $scope.enableTransform = false;
                    resizeMod(scaleItem.scaleValue,scaleItem);
                }

                // 特殊情况（实际大小、适应宽度）查找比例
                function findSize(larger,nowSize) {
                    var i;
                    if (larger){//找比当前状态比例 大 一档的比例
                        for(i=0;i<$scope.scales.length-2;i++){
                            if($scope.scales[i].scaleValue>nowSize){
                                break;
                            }
                        }
                    }else{//找比当前状态比例 小 一档的比例
                        for(i=$scope.scales.length-3;i>=0;i--){
                            if($scope.scales[i].scaleValue<nowSize){
                                break;
                            }
                        }
                    }
                    return $scope.scales[i].id;
                }

                //缩小
                $scope.scale = function () {
                    var toSize=1;
                    if(!$scope.forbidScale){
                        var nowSize=$scope.scales[$scope.scaleSelect.id].scaleValue;
                        if($scope.scaleSelect.special == true){//特殊情况需要找比例
                            toSize=findSize(false,nowSize);
                        }else{//非特殊情况
                            toSize=$scope.scaleSelect.id-1;
                        }

                        $scope.scaleSelect=$scope.scales[toSize];
                        resizeMod($scope.scales[toSize].scaleValue);
                        if (toSize <= 0){
                            $scope.forbidScale=true;
                        }
                    }
                }

                // 放大
                $scope.enlarge = function () {
                    var toSize=1;
                    if(!$scope.forbidEnlarge){
                        var nowSize=$scope.scales[$scope.scaleSelect.id].scaleValue;
                        if($scope.scaleSelect.special == true){//特殊情况需要找比例
                            toSize=findSize(true,nowSize);
                        }else{//非特殊情况
                            toSize=$scope.scaleSelect.id+1;
                        }
                        $scope.scaleSelect=$scope.scales[toSize];
                        resizeMod($scope.scales[toSize].scaleValue);
                        if (toSize >= ($scope.scales.length-3)){
                            $scope.forbidEnlarge=true;
                        }
                    }
                }

                $scope.adaptive = function () {
                    resizeMod($scope.scales[$scope.scales.length-1].scaleValue);
                    $scope.scaleSelect=$scope.scales[$scope.scales.length-1];
                }

                // 全屏
                $scope.fullScreen = function () {
                    $scope.full = $scope.full ? false : true;
                    if($scope.full){
                        launchFullscreen();
                    }else{
                        exitFullscreen();
                    }
                }

                // 全屏
                function launchFullscreen() {
                    var element=document.documentElement;
                    if(element.requestFullscreen) {
                        element.requestFullscreen();
                    } else if(element.mozRequestFullScreen) {
                        element.mozRequestFullScreen();
                    } else if(element.msRequestFullscreen){
                        element.msRequestFullscreen();
                    } else if(element.webkitRequestFullscreen) {
                        element.webkitRequestFullScreen();
                    }
                    setEditorHeight();
                }

                // 退出全屏
                function exitFullscreen() {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    }
                }

                // 全屏和取消全屏时调整编辑器高度
                document.addEventListener("fullscreenchange", function(e) {
                    setTimeout(function () {
                        setEditorHeight();
                    });
                });
                document.addEventListener("mozfullscreenchange", function(e) {
                    setTimeout(function () {
                        setEditorHeight();
                    });
                });
                document.addEventListener("webkitfullscreenchange", function(e) {
                    setTimeout(function () {
                        setEditorHeight();
                    });

                });
                document.addEventListener("msfullscreenchange", function(e) {
                    setTimeout(function () {
                        setEditorHeight();
                    });
                });

                function setEditorHeight() {
                    setTimeout(function () {
                        var wikiEditorContainer = $('#wikiEditorContainer')[0];
                        var wikiEditorPageContainer = $('#wikiEditorPageContainer')[0];
                        var height = (wikiEditorPageContainer.clientHeight - wikiEditorContainer.offsetTop) + 'px';
                        editor.setSize('auto', height);
                        $('#wikiEditorContainer').css('height', height);

                        var w = $("#__mainContent__");
                        w.css("min-height", "0px");
                    });
                }

                window.onresize = function () {
                    if (util.humpToSnake(util.parseUrl().pathname) == "/wiki/wiki_editor") {
                        setEditorHeight();
                        $scope.scaleSelect=$scope.scales[$scope.scales.length-1];
                        resizeMod();
                    }
                }

                editor.on("beforeChange", function (cm, changeObj) {
                    //console.log(changeObj);
                    if (currentPage && currentPage.isFirstEditor) {
                        return;
                    }
                    for (var i = changeObj.from.line; i < changeObj.to.line + 1; i++) {
                        if (!/^```[@\/]/.test(editor.getLine(i))) {
                            cm.getDoc().removeLineClass(i, 'wrap', 'CodeMirrorFold');
                        }
                    }
                });
                // 折叠wiki代码
                function foldWikiBlock(cm, changeObj) {
                    //console.log(changeObj);
                    if (!changeObj) {
                        return;
                    }
                    var start = -1, end = -1;
                    for (var i = 0; i < changeObj.text.length; i++) {
                        //cm.getDoc().removeLineClass(changeObj.from.line + i, 'wrap', 'CodeMirrorFold');
                        if (/^```[@\/]/.test(changeObj.text[i])) {
                            start = i;
                        }
                        if (start >= 0 && /^```/.test(changeObj.text[i])) {
                            end = i;
                        }
                        if (start >= 0 && end >= 0) {
                            editor.foldCode({line: changeObj.from.line + start, ch: changeObj.from.ch}, null, 'fold');
                            start = end = -1;
                        }
                    }

                    if (currentPage && currentPage.isFirstEditor) {
                        return;
                    }
                    start = end = -1;
                    for (var i = 0; i < changeObj.removed.length; i++) {
                        //cm.getDoc().removeLineClass(changeObj.from.line + i, 'wrap', 'CodeMirrorFold');
                        if (/^```[@\/]/.test(changeObj.removed[i])) {
                            start = i;
                        }
                        if (start >= 0 && /^```/.test(changeObj.removed[i])) {
                            end = i;
                        }
                        if (start >= 0 && end >= 0) {
                            cm.getDoc().removeLineClass(changeObj.from.line + i, 'wrap', 'CodeMirrorFold');
                            start = end = -1;
                        }
                    }

                }

                // 编辑器改变内容回调
                function changeCallback(cm, changeObj) {
                    if (!currentPage)
                        return;

                    //console.log(changeObj);
                    foldWikiBlock(cm, changeObj);

                    var content = editor.getValue();
                    //console.log(currentPage);

                    if (!currentPage.isModify && content != allWebstePageContent[currentPage.url]) {
                        //console.log(currentPage);
                        //console.log(content, allWebstePageContent[currentPage.url],content != allWebstePageContent[currentPage.url]);
                        currentPage.isModify = true;
                        initTree();
                    }

                    currentPage.isFirstEditor = undefined;

                    /*
                    changeTimer && clearTimeout(changeTimer);
                    changeTimer = setTimeout(function () {
                        savePageContent();                               // 每分钟提交一次server
                    }, 60000);
                    */
                }

                editor.on('scroll', function (cm) {
                    if (isScrollPreview)
                        return;
                    scrollTimer && clearTimeout(scrollTimer);
                    scrollTimer = setTimeout(function () {
                        var scaleSize = getScaleSize("scroll");
                        var initHegiht = editor.getScrollInfo().top + editor.heightAtLine(0);
                        var index = 0;
                        var block;
                        var blockList = mdwiki.blockList;
                        for (index = 0; index < blockList.length - 1; index++) {
                            block = blockList[index];
                            if (block.blockCache.isTemplate)
                                continue;

                            if (editor.heightAtLine(block.textPosition.from) >= initHegiht)
                                break;
                        }
                        block = blockList[index];
						if ($('#' + block.blockCache.containerId)[0]) {
							$('#preview').scrollTop($('#' + block.blockCache.containerId)[0].offsetTop * scaleSize);
						}
                    }, 100);
                });

                $('#preview').on('scroll mouseenter mouseleave', function (e) {
                    if (e.type == 'mouseenter') {
                        isScrollPreview = true;
                    } else if (e.type == 'mouseleave') {
                        isScrollPreview = false;
                    } else if (e.type == 'scroll') {
                        if (!isScrollPreview)
                            return;
                        scrollTimer && clearTimeout(scrollTimer);
                        scrollTimer = setTimeout(function () {
                            var scaleSize = getScaleSize("scroll");
                            var initHeight = editor.getScrollInfo().top + editor.heightAtLine(0);
                            var index = 0;
                            var block;
                            var blockList = mdwiki.blockList;
                            var scrollTop = $('#preview')[0].scrollTop;
                            for (index = 0; index < blockList.length - 1; index++) {
                                block = blockList[index];
                                if (block.blockCache.isTemplate)
                                    continue;
                                if (scrollTop <= $('#' + block.blockCache.containerId)[0].offsetTop * scaleSize) {
                                    //console.log(scrollTop, $('#' + block.blockCache.containerId)[0].offsetTop,scaleSize);
                                    break;
                                }
                            }
                            block = blockList[index];
                            editor.scrollTo(0, editor.getScrollInfo().top + editor.heightAtLine(block.textPosition.from) - initHeight);
                        }, 100);
                    }
                });


                var showTreeview = true;

                function initView() {
                    if ($scope.showFile){
                        $(".code-view").removeClass("nofile");
                        $(".toolbar-page-file").addClass("active");
                        $(".toolbar-new-site").addClass("active");
                        $("#treeview").show();
                    }else{
                        $(".code-view").addClass("nofile");
                        $(".toolbar-page-file").removeClass("active");
                        $(".toolbar-new-site").removeClass("active");
                        $("#treeview").hide();
                    }
                    if ($scope.showCode && $scope.showView){
                        $(".toolbar-page-slide").addClass("active");
                        $(".toolbar-page-code").removeClass("active");
                        $(".toolbar-page-design").removeClass("active");

                        $("#srcview").show();
                        $("#preview").show();
                        $("#srcview").addClass("col-xs-6");
                        $("#preview").addClass("col-xs-6");
                        resizeMod();
                    }else if ($scope.showCode && !$scope.showView){
                        $(".toolbar-page-code").addClass("active");
                        $(".toolbar-page-slide").removeClass("active");
                        $(".toolbar-page-design").removeClass("active");

                        $("#preview").hide();
                        $("#srcview").show();
                        $("#srcview").removeClass("col-xs-6");
                        $("#srcview").addClass("col-xs-12");
                        resizeMod();
                    }else if(!$scope.showCode && $scope.showView){
                        $(".toolbar-page-design").addClass("active");
                        $(".toolbar-page-slide").removeClass("active");
                        $(".toolbar-page-code").removeClass("active");

                        $("#srcview").hide();
                        $("#preview").show();
                        $("#preview").removeClass("col-xs-6");
                        $("#preview").addClass("col-xs-12");
                        resizeMod();
                    }
                    var scaleSize=getScaleSize();
                    $scope.scales[$scope.scales.length-1].scaleValue=scaleSize;
                    $scope.scaleSelect=$scope.scales[$scope.scales.length-1];//比例的初始状态为 “适合宽度”
                }

                $scope.toggleFile = function () {
                    $scope.showFile = $scope.showFile ? false : true;
                    initView();
                };

                $scope.newWebsite = function () {
                    modal('controller/newWebsiteController', {
                        controller: 'newWebsiteController',
                        size: 'lg'
                    }, function (wikiBlock) {
                        console.log(wikiBlock);
                    }, function (result) {
                        console.log(result);
                    });
                }

                $scope.showCodeView = function () {
                    $scope.showCode = true;
                    $scope.showView = false;
                    initView();
                };

                $scope.codeAndPreview = function () {
                    $scope.showCode = true;
                    $scope.showView = true;
                    initView();
                };

                $scope.showPreview = function () {
                    $scope.showCode = false;
                    $scope.showView = true;
                    initView();
                };

//获取剪贴板数据方法
                function getClipboardText(event) {
                    var clipboardData = event.clipboardData || window.clipboardData;
                    return clipboardData.getData("text");
                };

//设置剪贴板数据
                function setClipboardText(event, value) {
                    if (event.clipboardData) {
                        return event.clipboardData.setData("text/plain", value);
                    } else if (window.clipboardData) {
                        return window.clipboardData.setData("text", value);
                    }
                };

                function CreateElementForExecCommand(textToClipboard) {
                    var forExecElement = document.createElement("div");
                    // place outside the visible area
                    forExecElement.style.position = "absolute";
                    forExecElement.style.left = "-10000px";
                    forExecElement.style.top = "-10000px";
                    // write the necessary text into the element and append to the document
                    forExecElement.textContent = textToClipboard;
                    document.body.appendChild(forExecElement);
                    // the contentEditable mode is necessary for the  execCommand method in Firefox
                    forExecElement.contentEditable = true;

                    return forExecElement;
                }

                function SelectContent(element) {
                    // first create a range
                    var rangeToSelect = document.createRange();
                    rangeToSelect.selectNodeContents(element);

                    // select the contents
                    var selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(rangeToSelect);
                }

                function CopyToClipboard(value) {
                    var textToClipboard = value;

                    var success = true;
                    if (window.clipboardData) { // Internet Explorer
                        window.clipboardData.setData("Text", textToClipboard);
                    }
                    else {
                        // create a temporary element for the execCommand method
                        var forExecElement = CreateElementForExecCommand(textToClipboard);

                        /* Select the contents of the element
                         (the execCommand for 'copy' method works on the selection) */
                        SelectContent(forExecElement);

                        var supported = true;

                        // UniversalXPConnect privilege is required for clipboard access in Firefox
                        try {
                            if (window.netscape && netscape.security) {
                                netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
                            }

                            // Copy the selected content to the clipboard
                            // Works in Firefox and in Safari before version 5
                            success = document.execCommand("copy", false, null);
                        }
                        catch (e) {
                            success = false;
                        }

                        // remove the temporary element
                        document.body.removeChild(forExecElement);
                    }

                    if (success) {
                        //alert("网址已成功拷贝到剪切板!");
                        Message.info("网址已成功拷贝到剪切板!");
                    }
                    else {
                        //alert("您的浏览器不支持访问剪切板!");
                        Message.info("您的浏览器不支持访问剪切板!");
                    }
                }

                $('.toolbar-page-copyurl').on('click', function () {
                    CopyToClipboard($('#btUrl').val());
                });

                $('.toolbar-page-preview').on('click', function () {
                    editor.focus();
                    //var url = $('#btUrl').val() + "?branch=master";
                    var url = $('#btUrl').val();

                    if (url && currentPage.isModify) {
                        var tmpWin = window.open();
                        $scope.cmd_savepage(function () {
                            if (url) {
                                tmpWin.location = url;
                            }
                        });
                    } else {
                        window.open(url);
                    }

                });

                $('.toolbar-page-version').on('click', function () {
                    $scope.cmd_version();
                });

                $('.toolbar-page-hotkey').on('click', function () {
                    console.log('toolbar-page-hotkey');
                    $('#hotkeyModal').modal({
                        keyboard: true
                    })
                });

                $('.toolbar-page-knowledge').on('click', function () {
                    console.log('toolbar-page-knowledge');
                    util.go("knowledge");
                });

                $(function () {
                    var wellStartPos = $('.well').offset().top;

                    $.event.add(window, "scroll", function () {
                        var p = $(window).scrollTop();
                        if (p > wellStartPos) {
                            $('.well').css('position', 'fixed');
                            $('.well').css('top', '0px');
                            $('.well').css('left', '0px');
                            $('.well').css('right', '0px');

//                $('.treeview').css('position', 'fixed');
//                $('.treeview').css('top',p + $('#toolbarview').height());
                        } else {
                            $('.well').css('position', 'static');
                            $('.well').css('top', '');

//                $('.treeview').css('position','static');
//                $('.treeview').css('top','');
                        }
                    });
                });

                $scope.goHomePage = function () {
                    util.go("home");
                };

                $scope.goUserPage = function () {
                    util.goUserSite('/' + $scope.user.username);
                }

                $scope.goModPackagePage = function () {
                    util.go("mod/packages",true);
                };

                editor.on("paste", function (editor, e) {
                    if (!(e.clipboardData && e.clipboardData.items)) {
                        alert("该浏览器不支持操作");
                        return;
                    }
                    for (var i = 0, len = e.clipboardData.items.length; i < len; i++) {
                        var item = e.clipboardData.items[i];
                        // console.log(item.kind+":"+item.type);
                        if (item.kind === "string") {
                            item.getAsString(function (str) {
                                // str 是获取到的字符串
                                //console.log('get str');
                                //console.log(str);
                            })
                        } else if (item.kind === "file") {
                            var pasteFile = item.getAsFile();
                            // pasteFile就是获取到的文件
                            //console.log(pasteFile);
                            fileUpload(pasteFile);
                        }
                    }
                });

                editor.on("drop", function (editor, e) {
                    // console.log(e.dataTransfer.files[0]);
                    if (!(e.dataTransfer && e.dataTransfer.files)) {
                        alert("该浏览器不支持操作");
                        return;
                    }
                    for (var i = 0; i < e.dataTransfer.files.length; i++) {
                        //console.log(e.dataTransfer.files[i]);
                        fileUpload(e.dataTransfer.files[i]);
                    }
                    e.preventDefault();
                });

                //文件上传
                function fileUpload(fileObj) {
                    console.log(fileObj);
                    $scope.cmd_image_upload(fileObj);
                    return;
                }

                //阻止浏览器默认打开拖拽文件的行为
                window.addEventListener("drop", function (e) {
                    e = e || event;
                    e.preventDefault();
                    if (e.target.tagName == "textarea") {  // check wich element is our target
                        e.preventDefault();
                    }
                }, false);


                return editor;
            }
        }]);

    return htmlContent;
});
