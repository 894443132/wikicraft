/**
 * Created by wuxiangan on 2016/12/21.
 */

define([
	'app',
	'helper/util',
    'helper/mods',
	'text!wikimod/admin/html/index.html',
], function (app, util, mods, htmlContent) {
	app.registerController('indexController', ['$scope', '$auth', 'Account','modal', 'Message', function ($scope, $auth, Account, modal, Message) {
		var urlPrefix = "/wiki/js/mod/admin/js/";
		var tableName = "user";
		$scope.selectMenuItem = "manager";
		$scope.pageSize = 15;
		$scope.managerCurrentPage = 1;
		$scope.operationLogCurrentPage = 1;
		$scope.userCurrentPage = 1;
		$scope.siteCurrentPage = 1;
		$scope.domainCurrentPage = 1;
		$scope.fileCheckCurrentPage = 1;
		$scope.VIPCurrentPage = 1;
		$scope.totalItems = 0;
		$scope.data = [];
		$scope.test = [];
		//$scope.roleId = 10;
		
		$scope.managerSearchById;
		$scope.managerSearchByUsername;

		// 确保为管理员
		function ensureAdminAuth() {
			if (!Account.isAuthenticated()) {
				util.go(urlPrefix + "login");
				return;
			}

			var payload = $auth.getPayload();
			$scope.roleId = payload.roleId;
			
			if (!payload.isAdmin) {
				util.go(urlPrefix + "login");
			}
		}

		function init() {
			ensureAdminAuth();
			$scope.getManagerList();
			//$scope.clickMenuItem($scope.selectMenuItem);
		}

		$scope.$watch('$viewContentLoaded', init);

		/*
		$scope.clickQuery = function() {
			console.log($scope.query);
			for (var key in $scope.query) {
				if ($scope.query[key] == "") {
					$scope.query[key] = undefined;
				}
			}
			var tableName = getTableName();
			util.post(config.apiUrlPrefix + "tabledb/query", {
				tableName:tableName,
				page:$scope.currentPage,
				pageSize:$scope.pageSize,
				query:$scope.query,
			}, function(data){
				data = data || {};
				$scope.data = data.data || [];
				$scope.totalItems = data.total || 0;
				console.log($scope.datas);
			});
		}

		$scope.clickUpsert = function() {
			console.log($scope.query);
			for (var key in $scope.query) {
				if ($scope.query[key] == "") {
					$scope.query[key] = undefined;
				}
			}
			var tableName = getTableName();
			util.post(config.apiUrlPrefix + "tabledb/upsert", {
				tableName:tableName,
				query:$scope.query,
			}, function(data){
				if (data) {
					Message.info("添加成功");
					$scope.data.push(data);
					$scope.totalItems++;
				} else {
					Message.info("添加失败");
				}
			}, function(){
				Message.info("添加失败");
			});
		}

		$scope.clickEdit = function(x) {
			$scope.query = x;
		}

		$scope.clickDelete = function(x) {
			var tableName = getTableName();
			util.post(config.apiUrlPrefix + "tabledb/delete", {
				tableName:tableName,
				query:{
					_id:x._id,
				}
			}, function(){
				$scope.totalItems--;
				x.isDelete = true;
			}, function(){
			});
		}*/

		$scope.getStyleClass = function (item) {
			if ($scope.selectMenuItem == item) {
				return "panel-primary";
			}
			return;
		}

		/*
		$scope.clickMenuItem = function(menuItem) {
			$scope.query = {};
			$scope.selectMenuItem = menuItem;
			$scope.clickQuery();
			if ($scope.selectMenuItem == "manager") {
				$scope.query = {};
				$scope.getManagerList();
			} else if ($scope.selectMenuItem == "site") {
				$scope.getSiteList();
			}
		}*/

		// 获取管理员列表
		$scope.getManagerList = function (){
			//alert("asdasdasdasd");
			$scope.selectMenuItem = "manager";
			$scope.managerSearchById;
			$scope.managerSearchByUsername = "";
			util.post(config.apiUrlPrefix + "admin/getManagerList", {
				page:$scope.managerCurrentPage,
				pageSize:$scope.pageSize,
			}, function (data) {
				data = data || {};
				$scope.managerList = data.managerList || [];
				$scope.totalItems = data.total || 0;
			});
		}
		// 搜索管理员账号
		$scope.managerSearch = function (){
			//util.post(config.apiUrlPrefix + "tabledb/query", {
			//alert("111111111111");
			util.post(config.apiUrlPrefix + "admin/managerSearch", {
				_id:$scope.managerSearchById,
				username:$scope.managerSearchByUsername,
			}, function (data) {
				data = data || {};
				$scope.managerList = data.searchManagerList ;
				$scope.totalItems = data.total || 0;
			});
		}
		// 新建管理员账号
		/*
		$scope.managerSearch = function (){
			$scope.query = {
				_id:$scope.managerSearchById,
				username:$scope.managerSearchByUsername,
			};
			util.post(config.apiUrlPrefix + "tabledb/query", {
				tableName:"user",
				roleId:10,
				page:$scope.currentPage,
				pageSize:$scope.pageSize,
				query:$scope.query,
			}, function (data) {
				data = data || {};
				$scope.managerList = data.data || [];
				$scope.totalItems = data.total || 0;
			});
		}*/
		
		$scope.getDomainList = function (){
			//alert("asdasdasdasd");
			$scope.selectMenuItem = "domain";
			util.post(config.apiUrlPrefix + "admin/getDomainList", {
				page:$scope.domainCurrentPage,
				pageSize:$scope.pageSize,
			}, function (data) {
				data = data || {};
				$scope.domainList = data.domainList || [];
				$scope.totalItems = data.total || 0;
			});
		}
		
		$scope.getVIPList = function (){
			//alert("asdasdasdasd");
			$scope.selectMenuItem = "vip";
			util.post(config.apiUrlPrefix + "admin/getVIPList", {
				page:$scope.VIPCurrentPage,
				pageSize:$scope.pageSize,
			}, function (data) {
				data = data || {};
				$scope.VIPList = data.VIPList || [];
				$scope.totalItems = data.total || 0;
			});
		}
		
		// 获取用户列表
		$scope.getUserList = function (){
			$scope.selectMenuItem = "user";
			util.post(config.apiUrlPrefix + "admin/getUserList", {
				page:$scope.userCurrentPage,
				pageSize:$scope.pageSize,
			}, function (data) {
				data = data || {};
				$scope.userList = data.userList || [];
				$scope.totalItems = data.total || 0;
			});
		}
		// 点击编辑用户
		$scope.clickEditUser = function (user) {

		}
		// 点击禁用用户
		$scope.clickEnableUser = function (user) {
			user.roleId = user.roleId == -1 ? 0 : -1;
			util.post(config.apiUrlPrefix + "user/updateByName", {username:user.username, roleId:user.roleId}, function () {
			});
		}
		// 点击删除用户
		$scope.clickDeleteUser = function (user) {
			util.post(config.apiUrlPrefix + "user/deleteByName", user, function () {
				user.isDelete = true;
			});
		}

		// 获取站点列表
		$scope.getSiteList = function () {
			$scope.selectMenuItem = "site";
			util.post(config.apiUrlPrefix + "admin/getSiteList", {
				page:$scope.siteCurrentPage,
				pageSize: $scope.pageSize,
			}, function (data) {
				data = data || {};
				$scope.siteList = data.siteList || [];
				$scope.totalItems = data.total || 0;
			});
		}

		// 点击编辑站点
		$scope.clickEditSite = function () {

		}
		// 点击禁用的站点
		$scope.clickEnableSite = function () {
			site.state = site.state == -1 ? 0 :  -1;
			util.post(config.apiUrlPrefix + "website/updateByName", {username:site.username, sitename:site.name, state:site.state}, function () {
			});
		}
		// 点击删除站点
		$scope.clickDeleteSite = function (site) {
			util.post(config.apiUrlPrefix + "website/deleteById", {websiteId:site._id}, function () {
				site.isDelete = true;
			});
		}

		
		//
		$scope.getoperationLogList = function () {
			$scope.selectMenuItem = "operationLog";
		}
		
		$scope.getFileCheckList = function () {
			$scope.selectMenuItem = "fileCheck";
		}

		// wiki cmd
		$scope.clickUpsertWikicmd = function() {
			util.post(config.apiUrlPrefix + 'wiki_module/upsert', $scope.query, function(data){
				if (data) {
					Message.info("添加成功");
					$scope.data.push(data);
					$scope.totalItems++;
				} else {
					Message.info("添加失败");
				}
			});
		}

		$scope.insertAll = function () {
			var length = mods.length;
			console.log(length);
			for (var i=0; i<length; i++){
                util.post(config.apiUrlPrefix + 'wiki_module/upsert', mods[i], function(data){
                    if (data) {
                        Message.info("添加成功");
                        $scope.data.push(data);
                        $scope.totalItems++;
                    } else {
                        Message.info("添加失败");
                        console.log(mods[i]);
                    }
                });
			}
        }
	}]);

	return htmlContent;
});












