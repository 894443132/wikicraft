/**
 * Created by wuxiangan on 2016/12/21.
 */

define(['app', 'helper/util', 'text!html/login.html'], function (app, util, htmlContent) {
    app.registerController('kaitlynLoginController', ['$scope', '$state', '$auth', 'Account', function ($scope, $state, $auth, Account) {
        console.log("loginController");
        //$scope.errMsg = "用户名或密码错误";
        $scope.login = function () {
            $scope.errMsg = "";
            var params = {
                email: util.stringTrim($scope.email),
                password: util.stringTrim($scope.password),
            };
            if (!params.email || !params.password) {
                $scope.errMsg = "用户名或密码错误";
                $("#total-err").removeClass("visible-hidden");
                return;
            }
            util.http("POST", config.apiUrlPrefix + 'user/login', params, function (data) {
                $auth.setToken(data.token);
                Account.setUser(data.userInfo);
                console.log("登录成功");
                if (!data.userInfo.githubToken) {
                    Account.githubAuthenticate();
                }
                window.location.href = '/wiki/website';
            }, function (error) {
                $scope.errMsg = error.message;
                $("#total-err").removeClass("visible-hidden");
            });
        }

        $scope.githubLogin = function () {
            $auth.authenticate("github").then(function (response) {
                console.log("github认证成功!!!");
                $auth.setToken(response.data.token);
                Account.setUser(response.data.userInfo);
                window.location.href = '/wiki/website';
            }, function () {
                console.log("github认证失败!!!");
            });
        }
    }]);
    return htmlContent;
});
