/**
 * Created by wuxiangan on 2016/9/26.
 */

app.controller('mainCtrl', function ($scope, $rootScope, $http, $state, $compile, $auth, Account, SelfData, ProjectStorageProvider, Message) {
    // 信息提示框
    $("#messageTipCloseId").click(function () {
        Message.hide();
    });

    // 加载内容信息
    function initContentInfo() {
        $rootScope.IsRenderServerWikiContent = false;
        var moduleIframeParser = new ModuleIframeParser();
        var md = window.markdownit({html:true});
        var urlObj = util.parseUrl();

        // 置空用户页面内容
        moduleIframeParser.render("<div></div>");
        if (window.location.href.indexOf('#') >=0 || !urlObj.sitename || urlObj.sitename == "wiki") {
            if (window.location.path != "/" && window.location.hash) {                  // 带有#前端路由 统一用/#/url格式
                window.location.href="/" + window.location.hash;
            } else if (window.location.pathname == '/' && !window.location.hash) {     // wikicraft.cn  重定向/#/home
                window.location.href="/#/home";
            } else {                                                                           // /wiki/xxx    旧版本/wiki/xxx页
                $rootScope.IsRenderServerWikiContent = true;
            }
            //console.log($rootScope.IsRenderServerWikiContent);
            return ;
        }
        // 访问用户页
        util.http("POST", config.apiUrlPrefix + "website_pages/getDetailInfo", {sitename:urlObj.sitename, pagename:urlObj.pagename}, function (data) {
            data = data || {};
            // 这三种基本信息根化，便于用户页内模块公用
            $rootScope.userinfo = data.userinfo;
            $rootScope.siteinfo = data.siteinfo;
            $rootScope.pageinfo = data.pageinfo;
            var pageContent = data.pageinfo ? data.pageinfo.content : '<div>用户页丢失!!!</div>';
            pageContent = md.render(pageContent);
            var userpageObj = {user:$rootScope.user, userinfo:$rootScope.userinfo, siteinfo:$rootScope.siteinfo, pageinfo:$rootScope.pageinfo};
            util.setIframeParams(userpageObj); //
            sessionStorage.setItem("userpageObj", util.objectToJsonString(userpageObj));
            moduleIframeParser.render(pageContent);
        });

        /*
         $http.get('http://localhost:8099/wiki/html/templates/test.html').then(function (response) {
         console.log(response.data);
         var pageContent = response.data;
         pageContent = md.render(pageContent);
         util.setIframeParams({user:$rootScope.user, userinfo:$rootScope.userinfo, siteinfo:$rootScope.siteinfo, pageinfo:$rootScope.pageinfo});
         moduleIframeParser.render(pageContent);
         });
         */
    }
    
    // 初始化基本信息
    function initBaseInfo() {
        /*配置一些全局服务*/
        util.setAngularServices({$http:$http, $state:$state, $compile:$compile, $auth:$auth});
        util.setSelfServices({Account:Account, ProjectStorageProvider:ProjectStorageProvider, SelfData: SelfData, Message:Message});
        // iframe子模块信息初始化
        if (util.isSubMoudle()) {
            util.setParentIframeAutoHeight();
            var iframeParams = util.getIframeParams();
            //console.log(iframeParams);
            iframeParams.user.loaded && Account.setUser(iframeParams.user);
            $rootScope.userinfo = iframeParams.userinfo;
            $rootScope.siteinfo = iframeParams.siteinfo;
            $rootScope.pageinfo = iframeParams.pageinfo;
            $rootScope.isSubModule = true;
        }
        // 获取用户基本信息
        if (Account.isAuthenticated()) {
            if (Account.isLoaded()) {
                $scope.user = Account.getUser();
            } else {
                Account.getProfile();
            }
        }
        //console.log("mainCtrl");
    }
    
    function init() {
        initBaseInfo();
        initContentInfo();
    }

    //Account.ensureAuthenticated(init());
    init();
});

app.controller('testCtrl', function ($scope, $rootScope, $state, $http, $compile, Message) {
});

app.controller('commentCtrl', function ($scope, Account) {
    $scope.user = Account.getUser();
    $scope.isAuthenticated = Account.isAuthenticated();
    //$scope.tipInfo = "登录后才能评论!!!";
    //$scope.comment = {pageId:$scope.pageinfo._id, websiteId:$scope.siteinfo._id, userId:$scope.user._id};
    $scope.comment = {pageId:1, websiteId:1, userId:1};

    $scope.submitComment = function () {
        $scope.isAuthenticated = true;
        if (!$scope.isAuthenticated) {
            alert("登陆后才能评论!!!")
            return ;
        }
        $scope.comment.content = util.stringTrim($scope.comment.content);
        if (!$scope.comment.content || $scope.comment.content.length == 0) {
            return ;
        }
        util.post(config.apiUrlPrefix + 'website_comment/create', $scope.comment, function (data) {
            console.log(data);
            $scope.getCommentList();
        });
    }

    $scope.getCommentList = function () {
        util.post(config.apiUrlPrefix + 'website_comment/getByPageId',{pageId:1}, function (data) {
            $scope.commentObj = data;
        });
    }
    
    $scope.deleteComment = function (comment) {
        util.post(config.apiUrlPrefix + 'website_comment/deleteById', comment, function (data) {
            $scope.getCommentList();
        })
    }

    function init() {
        $scope.getCommentList();
    }

    init();
});

app.controller('siteshowCtrl', function ($scope) {
    var siteshowObj = sessionStorage.getItem("siteshow");
    siteshowObj = util.jsonStringToObject(siteshowObj);
    //console.log(siteshowObj);
    $scope.title = siteshowObj.title;
    $scope.requestUrl = siteshowObj.requestUrl;
    $scope.requestParams = siteshowObj.requestParams || {};
	$scope.requestParams.pageSize = 12;
	$scope.requestParams.page = 0;

    window.scrollTo(0,0);

    // 随机颜色
    $scope.getRandomColor = function (index) {
        return util.getRandomColor(index);
    }

    var height = (200 + Math.floor(($scope.requestParams.pageSize-1)/3) * 280) + "px";
    $(".workslistNav").css("height",height);
    height = Math.ceil($scope.requestParams.pageSize/3) * 280 + "px";
    $(".workslist").css("height",height);

    $scope.getSiteList = function (page) {
        if (!util.pagination(page, $scope.requestParams, $scope.siteObj && $scope.siteObj.pageCount)) {
            return ;
        }
        util.http("POST", $scope.requestUrl, $scope.requestParams, function (data) {
            $scope.siteObj = data;
        });
    }

    function init() {
        $scope.getSiteList();
    }

    init();
});

app.controller('usershowCtrl', function ($scope, SelfData) {
    var usershowObj = sessionStorage.getItem("usershow");
    usershowObj = util.jsonStringToObject(usershowObj);
    console.log(usershowObj);
    $scope.title = usershowObj.title;
    $scope.requestUrl = usershowObj.requestUrl;
    $scope.requestParams = usershowObj.requestParams || {};
    $scope.requestParams.pageSize = 9;
    $scope.requestParams.page = 0;

    window.scrollTo(0,0);

    // 随机颜色
    $scope.getRandomColor = function (index) {
        return util.getRandomColor(index);
    }

    var height = (200 + Math.floor(($scope.requestParams.pageSize-1)/3) * 280) + "px";
    $(".workslistNav").css("height",height);
    height = Math.ceil($scope.requestParams.pageSize/3) * 280 + "px";
    $(".workslist").css("height",height);

    $scope.getUserList = function (page) {
        if (!util.pagination(page, $scope.requestParams, $scope.userObj && $scope.userObj.pageCount)) {
            return ;
        }

        var url = $scope.requestUrl || config.apiUrlPrefix + "user/getByWebsiteId"; // 获得最近更新

        util.http("POST", url, $scope.requestParams, function (data) {
            $scope.userObj = data;
        });
    }

    function init() {
        $scope.getUserList();
    }

    init();
});

app.controller("worksApplyCtrl", function ($scope, $state, Account, Message) {
    $scope.user = Account.getUser();
    $scope.worksSelected = [];
    $scope.submitDisabled = "";

    var userpageObj = sessionStorage.getItem("userpageObj");
    userpageObj = util.jsonStringToObject(userpageObj);

    $scope.worksSelectChange = function () {
        console.log($scope.worksSelected);
        $scope.worksSelected.length ? $("#submitId").removeAttr("disabled") : $("#submitId").attr({"disabled":"disabled"});
    };

    $scope.worksApply = function () {
        var websiteId = sessionStorage.getItem("workApplyWebsiteId");
        var applyIdList = [];

        websiteId = parseInt(websiteId);
        for (i=0; i < $scope.worksSelected.length; i++) {
            applyIdList.push(parseInt($scope.worksSelected[i]));
        }
        var params = {
            userId:userpageObj.user._id,
            applyIdList:applyIdList,
            websiteId:websiteId,
        }
        util.http("POST", config.apiUrlPrefix + 'website_apply/worksBatchApply', params, function (data) {
            console.log("投稿成功");
            Message.info("投稿成功");
            history.back();
        });
    }

    function init() {
        $("#submitId").attr({"disabled":"disabled"});
        util.http("POST", config.apiUrlPrefix + "website/getAllByUserId", {userId:userpageObj.user._id}, function (data) {
            $scope.siteList = data;
        });
    }

    init();
});

app.controller("worksSiteCtrl", function ($scope, $state, SelfData){
    $scope.favoriteParams = {page:1, pageSize:6};
    $scope.favoriteObj = {};

    $scope.getRandomColor = function (index) {
        return util.getRandomColor(index);
    }

    // 更多我的收藏
    $scope.goAllFavoriteList = function () {
        SelfData.requestUrl =  config.apiUrlPrefix + "website/getFavoriteSortList";
        SelfData.requestParams = $scope.favoriteParams;
        $state.go("siteshow");
    }

    $scope.getFavoriteList = function (page) {
        $scope.favoriteParams.page = page ? (page > 0 ? page : 1) : $scope.favoriteParams.page;

        if ($scope.favoriteObj.pageCount && $scope.favoriteParams.page > $scope.favoriteObj.pageCount) {
            $scope.favoriteParams.page = $scope.favoriteObj.pageCount
        }
        var url = $scope.favoriteParams.url || config.apiUrlPrefix + "website/getFavoriteSortList"; // 获得最近更新

        util.http("POST", url, $scope.favoriteParams, function (data) {
            $scope.favoriteObj = data;
        });
    }

    function init() {
        $scope.getFavoriteList()
    }
    init();
});

app.controller('editWebsiteCtrl', function ($scope, $state, ProjectStorageProvider, SelfData, Account) {
    const github = ProjectStorageProvider.getDataSource('github');
    $scope.tags=["tag1","tag2"];
    $scope.classifyList = ["普通","入围","热门"];
    $scope.roleList = [{id:1, name:"普通"},{id:10, name:"评委"}];

    var siteinfo = sessionStorage.getItem("editWebsiteParams");
    siteinfo = util.jsonStringToObject(siteinfo);
    $scope.website = siteinfo;

    $('#uploadPictureBtn').change(function (e) {
        console.log("hello world")
        return ;
        var fileReader = new FileReader();
        fileReader.onload = function(){
            github.uploadImage("portrait", fileReader.reault, function (error, result, request) {
                if (error) {
                    console.log("上传失败");
                    return ;
                }
                $scope.website.logoUrl = result.content.download_url;
                $('#websiteLogo').attr('src',fileReader.result);
            });
        };
        fileReader.readAsDataURL(e.target.files[0]);
    });
    
    $scope.roleSelect = function (userinfo) {
        userinfo.roleInfo.roleId = parseInt(userinfo.roleInfo.roleUIIndex);
        userinfo.roleInfo.roleId = $scope.roleList[userinfo.roleInfo.roleId].id;
        var role = angular.copy(userinfo.roleInfo);
        role.roleUIIndex = undefined;
        util.post(config.apiUrlPrefix + 'website_member/updateById', {_id:role._id, roleId:role.roleId}, function (data) {
            console.log(data);
        });
    }

    $scope.getRoleName = function (roleId) {
        for (i = 0; i < $scope.roleList.length; i++) {
            if ($scope.roleList[i].id == roleId) {
                return $scope.roleList[i].name;
            }
        }
        return "";
    }
    $scope.classifySelect = function (site) {
        site.classifyInfo.worksFlag = parseInt(site.classifyInfo.worksFlag);
        util.post(config.apiUrlPrefix + 'website_works/updateById', {_id:site.classifyInfo._id, worksFlag:site.classifyInfo.worksFlag}, function (data) {
            console.log(data);
        });
    }
    
    $scope.getClassifyName = function (worksFlag) {
        return $scope.classifyList[worksFlag];
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
    
    $scope.modifyWebsite = function () {
        util.post(config.apiUrlPrefix + 'website/updateWebsite', $scope.website, function (data) {
           $scope.website = data;
        });
    }

    $scope.agreeMember = function (applyId) {
        util.post(config.apiUrlPrefix + 'website_apply/agreeMember',{applyId:applyId, websiteId:siteinfo._id}, function (data) {
            $scope.userObj = data;
			$scope.memberManager();
        });
    }

    $scope.refuseMember = function (applyId) {
        util.post(config.apiUrlPrefix + 'website_apply/refuseMember',{applyId:applyId, websiteId:siteinfo._id}, function (data) {
            $scope.userObj = data;
			$scope.memberManager();
        })
    }

    $scope.memberManager = function () {
        util.post(config.apiUrlPrefix + 'website_apply/getMember', {websiteId:siteinfo._id}, function (data) {
            $scope.userObj = data;
        });
        
        util.post(config.apiUrlPrefix + 'website_member/getByWebsiteId', {websiteId:siteinfo._id}, function (data) {
           $scope.userRoleObj = data;
        });
    }

    $scope.worksManager = function () {
        util.post(config.apiUrlPrefix + 'website_apply/getWorks', {websiteId:siteinfo._id}, function (data) {
           $scope.siteObj = data;
        });

        util.post(config.apiUrlPrefix + 'website_works/getByWebsiteId', {websiteId:siteinfo._id}, function (data) {
           $scope.worksObj = data;
        });
    }
    
    $scope.agreeWorks = function (applyId) {
        util.post(config.apiUrlPrefix + 'website_apply/agreeWorks',{applyId:applyId, websiteId:siteinfo._id}, function (data) {
            $scope.siteObj = data;
            $scope.worksManager();
        });
    }
    
    $scope.refuseWorks = function (applyId) {
        util.post(config.apiUrlPrefix + 'website_apply/refuseWorks',{applyId:applyId, websiteId:siteinfo._id}, function (data) {
            $scope.siteObj = data;
            $scope.worksManager();

        });
    }

    function init() {
    }

    //Account.ensureAuthenticated(init());
});

app.controller('gitVersionCtrl', function ($scope, $state, $sce, $auth,ProjectStorageProvider,Account) {
    const github = ProjectStorageProvider.getDataSource('github');
    console.log("gitVersionCtrl");
    $scope.dtStartOpened = false;
    $scope.dtEndOpened = false;
    $scope.filelist = [];
    $scope.commits = [];

    if (!Account.isAuthenticated()) {
        $state.go("login");
        return;
    }
    var user = Account.getUser();
    github.init({
        //username: '765485868@qq.com',
        //password: 'wxa765485868',
        token:user.githubToken,
    }, function (error) {
        init();
    });
    // 获得git文件列表
    function init() {
        github.getTree('master', true, function (error, result, request) {
            var filelist = []
            for(var i = 0; result && i < result.length; i++) {
                filelist.push({path:result[i].path});
            }
            $scope.filelist = filelist;
        });
    }

    $scope.dtStartOpen = function () {
        $scope.dtStartOpened = !$scope.dtStartOpened;
    }
    $scope.dtEndOpen = function () {
        $scope.dtEndOpened = !$scope.dtEndOpened;
    }

    $scope.submit = function () {
        var params = {
            sha:$scope.sha,
            path:$scope.path,
            author:undefined,
            since:$scope.dtStart && ($scope.dtStart.toLocaleDateString().replace(/\//g,'-') +'T00:00:00Z'),
            until:$scope.dtEnd && ($scope.dtEnd.toLocaleDateString().replace(/\//g,'-') +'T23:59:59Z'),
        };
        console.log(params);
        github.listCommits(params, function (error, result, request) {
            result = result || [];
            var commits = [];
            for (var i = 0; i < result.length; i++) {
                commits.push({sha:result[i].sha, message:result[i].commit.message, date:result[i].commit.committer.date, html_url:result[i].html_url});
            }
            console.log(commits);
            $scope.commits = commits;
            $scope.$apply();
        });
    }
    
    $scope.viewCommit = function (commit) {
        window.open(commit.html_url);
    }
    
    $scope.rollbackFile = function (commit) {
        github.getSingleCommit(commit.sha, function (error, result, request) {
            if (error) {
                console.log(error);
                return;
            }
            console.log(result);
            // 回滚文件
            for(var i = 0; i < result.files.length; i++) {
                github.rollbackFile(commit.sha, result.files[i].filename, 'rollback file: ' + result.files[i].filename)
            }
        });
    }
    // 路径过滤
    $scope.pathSelected =function ($item, $model) {
        $scope.path = $item.path;
    }
});

app.controller('websiteCtrl', function ($scope,$state,$http, Account, SelfData) {
	console.log("websiteCtrl");
    $scope.websites = [];
    $scope.max_free_count = 3;

    function init() {
        // 获取项目列表
        util.http('POST', config.apiUrlPrefix+'website',{userId:Account.getUser()._id || -1}, function (data) {
            $scope.websites = data;
        });
    }

    // 访问网站
    $scope.goWebsiteIndexPage = function(websiteName) {
	    window.location.href= '/' + websiteName;
    }

    // 编辑网站页面
	$scope.goEditWebsitePagePage = function (website) {
        sessionStorage.setItem("editWebsitePageParams", util.objectToJsonString(website));
        window.location.href="/wiki/editor";
    }

    //  创建网站
    $scope.goCreateWebsitePage = function () {
        SelfData.website = undefined;
        $state.go('createWebsite');
    }

    // 编辑网站
    $scope.goEditWebsitePage = function (website) {
        sessionStorage.setItem("editWebsiteParams", util.objectToJsonString(website));
        $state.go('editWebsite');
    }

    // 删除网站
    $scope.deleteWebsite = function(id) {
        util.http("DELETE", config.apiUrlPrefix+'website', {_id:id}, function (data) {
            $scope.websites = data;
        });
    }

	Account.ensureAuthenticated(init);
});

app.controller('createWebsiteCtrl', function ($scope, $state, $http, $sce, SelfData, ProjectStorageProvider, Account) {
    const github = ProjectStorageProvider.getDataSource('github');
    $scope.website = SelfData.website || {};
    $scope.editWebsite = SelfData.website ? true : false;
    $scope.websiteNameErrMsg = "";
    $scope.websiteDomainErrMsg = "";
    $scope.errMsg = "";
    $scope.tags = $scope.website.tags ? $scope.website.tags.split('|') : [];
    $scope.commonTags = ['旅游', '摄影', 'IT', '游戏', '生活']
    $scope.categories = [];//[{name:'个人网站'},{name:'作品网站'},{name:'组织网站'}];
    $scope.subCategories = [];
    $scope.step = 1;
    $scope.nextStepDisabled = !$scope.website.name;
    $scope.isPreview = true;
    config.templateObject = {executeTemplateScript:false};
    var logoContent = undefined;
    init();

    $('#uploadImageBtn').change(function (e) {
        var fileReader = new FileReader();
        fileReader.onload = function(){
            $('#websiteLogo').attr('src',fileReader.result);
            logoContent = fileReader.result;
        };
        fileReader.readAsDataURL(e.target.files[0]);
    });

    function init() {
/*
        if ($scope.website.logoUrl) {
            $http.get("https://raw.githubusercontent.com/wxaxiaoyao/wikicraftDataSource/master/images/website/websiteLogo_1479116829615").then(function (response) {
                $('#websiteLogo').attr('src',response.data);
            });
        }
*/
        //util.http('POST', config.apiUrlPrefix+'website_category',{}, function (data) {
        util.http('POST', config.apiUrlPrefix+'website_template_config',{}, function (data) {
            $scope.categories = data;
            for (var i = 0; $scope.categories && i < $scope.categories.length; i++){
                var cateory  = $scope.categories[i];
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
			
			if ($scope.editWebsite == false) {  // 创建时默认选择第一个
				$scope.templates = $scope.categories[0].templates;
				$scope.styles = $scope.templates[0].styles;
				$scope.website.categoryId = $scope.categories[0]._id;
				$scope.website.categoryName = $scope.categories[0].name;
				$scope.website.templateId = $scope.templates[0]._id;
				$scope.website.templateName = $scope.templates[0].name;
				$scope.website.styleId = $scope.styles[0]._id;
				$scope.website.styleName = $scope.styles[0].name;
			}
        });
    }

    function  createWebsiteRequest() {
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
/*
        if (logoContent) {
            var date = new Date();
            var filename = 'website/logoContent' + date.getTime();
            github.uploadImage(filename, logoContent, function (error, result, request) {
                if (error) {
                    console.log(error);
                } else {
                    $scope.website.logoUrl = result.content.download_url;
                }
                // 修改logourl
                util.http('PUT', config.apiUrlPrefix + "website", $scope.website, function (data) {
                    $scope.step++;
                });
            });
        }
*/
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

        util.http('POST', config.apiUrlPrefix+'website', {name:$scope.website.name}, function (data) {
            if (data && data.length > 0 && $scope.website._id != data[0]._id) {
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
        util.http('POST', config.apiUrlPrefix+'website', {domain:$scope.website.domain}, function (data) {
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
                return ;
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
                return ;
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
    $scope.goWebsiteIndexPage = function(websiteName) {
		window.location.href = '/' + websiteName;
    }
});

app.controller('previewCtrl', function ($scope) {
	console.log("previewCtrl");
    var filename = window.location.search.replace('?','');
    util.setScope($scope);
    var moduleParser = new ModuleParser($scope);
	var md = window.markdownit({html:true});
	
    // 获取页面
    util.http('POST', config.apiUrlPrefix+'website_template_config/getTemplatePageByFilename', {filename:filename}, function(data){
        // 获取页面中模板
			var pageContent = data ? data : '<div>用户页丢失!!!</div>';
			pageContent = md.render(pageContent);
			moduleParser.render(pageContent);
    })
});

