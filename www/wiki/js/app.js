/**
 * Created by wuxiangan on 2016/12/19.
 */

define(['angular', 'angular-ui-router', 'angular-ui-bootstrap', 'satellizer'], function (angular) {
    console.log("app");
    var app = angular.module('webapp',['ui.router', 'ui.bootstrap', 'satellizer']);
    
    app.config(function ($controllerProvider, $authProvider) {
        // 提供动态注册控制器接口
        app.registerController = function (name, constructor) {
            $controllerProvider.register(name, constructor);
        };

        // github 认证配置
        $authProvider.github({
            url: "/api/wiki/auth/github",
            clientId: '44ed8acc9b71e36f47d8',
            redirectUri: window.location.origin + '/wiki/login',
            // scope: ["public_repo", "delete_repo"],
            scope: ["public_repo"],
        });
    });
    
    return app;
});