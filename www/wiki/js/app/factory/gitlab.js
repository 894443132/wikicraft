/**
 * Created by wuxiangan on 2017/3/24.
 */

define([
    'app',
    'helper/util',
    'helper/dataSource',
    'helper/storage',
    'js-base64',
], function (app, util, dataSource, storage) {
    function _encodeURIComponent(url) {
        return encodeURIComponent(url);
        //return encodeURIComponent(url).replace(/\./g,'%2E')
    }

    app.factory('gitlab', ['$http', function ($http) {
        var gitlab = {
            inited: false,                                          // is already init
            username: '',   // gitlab 用户名                        // gitlab username
            lastCommitId: "master",                                // 最新commitId  替代master  用于cdn加速
            projectId: undefined,                                  // project id
            projectName: 'keepworkdatasource',                   // repository name
			projectMap:{},                                      // 项目列表
            apiBaseUrl: 'http://git.keepwork.com/api/v4',     // api base url
            rawBaseUrl: 'http://git.keepwork.com',              // raw base url
            rootPath: '',                                           // 根路径
            httpHeader: {},
        };

        // http请求
        gitlab.httpRequest = function (method, url, data, cb, errcb) {
            //console.log(url);
            var config = {
                method: method,
                url: this.apiBaseUrl + url,
                headers: this.httpHeader,
                skipAuthorization: true,  // 跳过插件satellizer认证
            };

            data = data || {};
            data.per_page = 100;

            if (method == "POST" || method == "PUT") {
                config.data = data;
            } else {
                config.params = data;
            }

            var result = undefined;
            var success = function (response) {
                var headers = response.headers();
                if (headers["x-next-page"] && data.isFetchAll) {
                    data.page = parseInt(headers["x-next-page"]);
                    result = (result || []).concat(response.data);
                    console.log(result);
                    $http(config).then(success).catch(failed);
                } else {
                    result = result ? (result.concat(response.data)) : response.data;
                    typeof cb == 'function' && cb(result);
                }
            };
            var failed = function (response) {
                console.log(response);
                typeof errcb == 'function' && errcb(response);
            };

            $http(config).then(success).catch(failed);
        }

        gitlab.getLongPath = function (params) {
            return this.rootPath + (params.path || "");
        }

        gitlab.getCommitUrlPrefix = function (params) {
            params = params || {};
            return this.rawBaseUrl + '/' + (params.username || this.username) + '/' + (params.projectName || this.projectName).toLowerCase() + this.getLongPath(params);
        }

        gitlab.getRawContentUrlPrefix = function (params) {
            params = params || {};
			var authStr = this.dataSource == "private" ? "?private_token=" + this.dataSource.dataSourceToken : "";
            return this.rawBaseUrl + '/' + (params.username || this.username) + '/' + (params.projectName || this.projectName).toLowerCase() + '/raw/' + (params.sha || this.lastCommitId) + this.getLongPath(params) + authStr;
        }

        gitlab.getContentUrlPrefix = function (params) {
            params = params || {};
			var authStr = this.dataSource == "private" ? "?private_token=" + this.dataSource.dataSourceToken : "";
            return this.rawBaseUrl + '/' + (params.username || this.username) + '/' + (params.projectName || this.projectName).toLowerCase() + '/blob/'+ (params.sha || this.lastCommitId) + this.getLongPath(params) + authStr;
        }

        // 获得文件列表
        gitlab.getTree = function (params, cb, errcb) {
            var self = this;
            var url = '/projects/' + self.projectId + '/repository/tree';
            var path = self.getLongPath(params);
            params.path = path.substring(1);
            params.recursive = params.recursive == undefined ? true : params.recursive;
            params.isFetchAll = params.recursive;
            self.httpRequest("GET", url, params, function (data) {
                var pagelist = [];
                for (var i = 0; i < data.length; i++) {
                    var path = '/' + data[i].path;
                    var page = {pagename: data[i].name};
                    var suffixIndex = path.lastIndexOf(".md");
                    // 不是md文件不编辑
                    if (suffixIndex < 0)
                        continue;

                    page.url = path.substring(self.rootPath.length, path.lastIndexOf('.'));
                    var paths = page.url.split('/');
                    if (paths.length < 3)
                        continue;

                    page.username = paths[1];
                    page.sitename = paths[2];
                    page.pagename = paths[paths.length - 1];

                    pagelist.push(page);
                }
                cb && cb(pagelist);
            }, errcb);
        }

        // commit
        gitlab.listCommits = function (data, cb, errcb) {
            //data.ref_name = data.ref_name || 'master';
            var url = '/projects/' + this.projectId + '/repository/commits';
            this.httpRequest('GET', url, data, cb, errcb);
        };

        // 获取文件操作的url prefix
        gitlab.getFileUrlPrefix = function () {
            return '/projects/' + this.projectId + '/repository/files/';
        }
        // 获取调教信息前缀 commit message prefix
        gitlab.getCommitMessagePrefix = function () {
            return "keepwork commit: ";
        }
        // 设置lastCommitId
        gitlab.setLastCommitId = function (lastCommitId) {
            this.lastCommitId = lastCommitId;
        }
        // 获取lastCommitId
        gitlab.getLastCommitId = function (cb, errcb) {
            var self = this;
            self.listCommits({}, function (data) {
                if (data && data.length > 0) {
                    self.lastCommitId = data[0].id;
                } else {
                    self.lastCommitId = "master";
                }
                cb && cb(self.lastCommitId);
            }, errcb);
        }

        // 写文件
        gitlab.writeFile = function (params, cb, errcb) {
            var self = this;
            params.path = self.getLongPath(params).substring(1);
            var url = self.getFileUrlPrefix() + _encodeURIComponent(params.path);
            params.commit_message = self.getCommitMessagePrefix() + params.path;
            params.branch = params.branch || "master";
            self.httpRequest("GET", url, {path: params.path, ref: params.branch}, function (data) {
                // 已存在
                self.httpRequest("PUT", url, params, function (data) {
                    //console.log(data);
                    cb && cb(data);
                }, errcb)
            }, function () {
                self.httpRequest("POST", url, params, cb, errcb)
            });
        }

        // 获取文件
        gitlab.getContent = function (params, cb, errcb) {
            var self = this;
            params.path = self.getLongPath(params).substring(1);
            var url = self.getFileUrlPrefix() + _encodeURIComponent(params.path);
            params.ref = params.ref || self.lastCommitId;
            self.httpRequest("GET", url, params, function (data) {
                data.content = data.content && Base64.decode(data.content);
                cb && cb(data.content);
            }, errcb);

            //gitlab.getRawContent(params, cb, errcb);
        }

        // 获取原始内容
        gitlab.getRawContent = function (params, cb, errcb) {
            var self = this;
            var index = params.path.lastIndexOf('.');
            var url = index == -1 ? params.path : params.path.substring(0, index);
            var _getRawContent = function () {
                var apiurl = self.getRawContentUrlPrefix(params);
                $http({
                    method: 'GET',
                    url: apiurl,
                    //url: apiurl + "?private_token=" + self.dataSource.dataSourceToken,
					//headers:self.httpHeader,
                    skipAuthorization: true, // this is added by our satellizer module, so disable it for cross site requests.
				}).then(function (response) {
					storage.indexedDBSetItem(config.pageStoreName, {url:url, content:response.data});
                    cb && cb(response.data);
                }).catch(function (response) {
                    errcb && errcb(response);
                });
            }
            // _getRawContent();
            // return;
            storage.indexedDBGetItem(config.pageStoreName, url, function (page) {
                //console.log(page, url);
                if (page) {
                    cb && cb(page.content);
                } else {
                    _getRawContent();
                    //gitlab.getContent(params, cb, errcb);
                }
            }, function () {
                _getRawContent();
                //gitlab.getContent(params, cb, errcb);
            });
        }

        // 删除文件
        gitlab.deleteFile = function (params, cb, errcb) {
            var self = this;
            params.path = self.getLongPath(params).substring(1);
            var url = self.getFileUrlPrefix() + _encodeURIComponent(params.path);
            params.commit_message = self.getCommitMessagePrefix() + params.path;
            params.branch = params.branch || "master";
            self.httpRequest("DELETE", url, params, cb, errcb)
        }

        // 上传图片
        gitlab.uploadImage = function (params, cb, errcb) {
            var self = this;
            //params path, content
            var path = params.path;
            var content = params.content;
            if (!path) {
                path = 'img_' + (new Date()).getTime();
            }
            path = '/images/' + path;
            /*data:image/png;base64,iVBORw0KGgoAAAANS*/
            content = content.split(',');
            if (content.length > 1) {
                var imgType = content[0];
                content = content[1];
                imgType = imgType.match(/image\/([\w]+)/);
                imgType = imgType && imgType[1];
                if (imgType) {
                    path = path + '.' + imgType;
                }
            } else {
                content = content[0];
            }
            //console.log(content);
            self.writeFile({
                path: path,
                message: self.getCommitMessagePrefix() + path,
                content: content,
                encoding: 'base64'
            }, function (data) {
				//var imgUrl = self.getRawContentUrlPrefix({sha:"master"}) + '/' + data.file_path + (self.dataSource.visibility  == "private" ? ("?private_token=" + self.dataSource.dataSourceToken) : ""); 
				var imgUrl = self.getRawContentUrlPrefix({sha:"master", path:path}); 
                cb && cb(imgUrl);
            }, errcb);
        }

        // 初始化
        gitlab.init = function (dataSource, cb, errcb) {
            var self = this;
            if (self.inited) {
                cb && cb();
                return;
            }
			console.log(dataSource);
            self.type = dataSource.type;
            self.username = dataSource.dataSourceUsername;
            self.httpHeader["PRIVATE-TOKEN"] = dataSource.dataSourceToken;
            self.apiBaseUrl = dataSource.apiBaseUrl;
            self.rawBaseUrl = dataSource.rawBaseUrl || "http://git.keepwork.com";
            // 移到站点中
			self.rootPath = dataSource.rootPath || '';
            self.lastCommitId = dataSource.lastCommitId || "master";
            self.projectName = dataSource.projectName || self.projectName;
            self.projectId = dataSource.projectId || undefined;
			self.visibility = dataSource.visibility || "public";
			self.dataSource = dataSource;

            if (!dataSource.dataSourceUsername || !dataSource.dataSourceToken || !dataSource.apiBaseUrl || !dataSource.rawBaseUrl) {
                console.log("gitlab data source init failed!!!");
                errcb && errcb();
                return;
            }

			self.setDefaultProject({projectName:self.projectName, visibility:self.visibility}, function() {
				self.inited = true;
				cb && cb();
			}, errcb);

			return;
        };

		// 创建webhook
		gitlab.createWebhook = function (projectId) {
			var self = this;
			var hookUrl = config.apiUrlPrefix + "data_source/gitlabWebhook";
			//var hookUrl = "http://dev.keepwork.com/api/wiki/models/data_source/gitlabWebhook";
			var isExist = false;
			self.httpRequest("GET", "/projects/" + projectId + "/hooks", {}, function (data) {
				//console.log(data);
				for (var i = 0; i < data.length; i++) {
					//gitlab.httpRequest("DELETE", "/projects/" + gitlab.projectId + "/hooks/" + data[i].id, {});
					if (data[i].url == hookUrl && data[i].push_events) {
						isExist = true;
					}
				}
				// return;
				// 不存在创建
				if (!isExist) {
					self.httpRequest("POST", "/projects/" + projectId + "/hooks", {
						url: hookUrl,
						push_events: true,
						enable_ssl_verification: false,
					}, function () {
						console.log("webhook create success");
					}, function () {
						console.log("webhook create failed");
					});
				}
			}, function () {

			});
		};

		// 设置默认项目
		gitlab.setDefaultProject = function(params, cb, errcb) {
			if (!params.projectName) {
				errcb && errcb();
				return;
			}

			var self = this;
			var projectName = params.projectName;
			var visibility = params.visibility || "public";
			self.projectName = projectName;
		
			var successCallback = function(params) {
				self.createWebhook(params.projectId);
				self.projectName[projectName] = {
					projectId:params.projectId,
					lastCommitId:params.lastCommitId || "master",
				};
				// 更新项目ID
                util.post(config.apiUrlPrefix + 'site_data_source/updateById', {_id:self.dataSource._id, projectId:params.projectId});

				self.projectId = params.projectId;
				cb && cb();	
				return;
			}


			if (self.projectMap[projectName]) {
				self.projectId = self.projectMap[projectName].projectId;
				self.lastCommitId = self.projectMap[projectName].lastCommitId;
				cb && cb();
				return;
			}

            self.httpRequest("GET", "/projects", {search: projectName, owned: true}, function (projectList) {
				var project = undefined;
				var method = "POST";
				var url = "/projects";
				var data = {name:projectName, visibility: visibility, request_access_enabled:true};

                // 查找项目是否存在
                for (var i = 0; i < projectList.length; i++) {
                    if (projectList[i].name.toLowerCase() == projectName.toLowerCase()) {
                        project = projectList[i];
                        break;
                    }
                }

				// 不存在或需要修改
				if (!project) {
					self.httpRequest(method, url, data, function (project) {
						//console.log(project);
						successCallback({projectId:project.id, projectName:params.projectName,lastCommitId:params.lastCommitId});
						//self.getLastCommitId(cb, errcb);
					}, errcb);
				} else if (project.visibility != visibility) {
					//console.log(project);
					method = "PUT";
					url += "/" + project.id;
					data.id = project.id;
					
					// 不存在则创建项目 存在更新
					self.httpRequest(method, url, data, function (project) {
						//console.log(project);
						successCallback({projectId:project.id, projectName:params.projectName,lastCommitId:params.lastCommitId});
						//self.getLastCommitId(cb, errcb);
					}, errcb);
				} else {
					successCallback({projectId:project.id, projectName:params.projectName,lastCommitId:params.lastCommitId});
				}
            }, errcb);
		}

        // 是否已经初始化
        gitlab.isInited = function () {
            return this.inited;
        };

        // 获取数据源类型：gitlab
        gitlab.getDataSourceType = function () {
            return this.type;
        };

        // 数据源工厂
        var gitlabFactory = function () {
            return angular.copy(gitlab);
        };

        // 注册数据源构造器
        dataSource.registerDataSourceFactory("gitlab", gitlabFactory);

        return gitlabFactory;
    }]);
});
