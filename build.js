/**
 * Created by wuxiangan on 2017/1/5.
 */

({
    appDir:"www",
    dir:'www_build',
    baseUrl:'wiki/js',
    //name:'main',
    optimizeCss: 'standard',
    removeCombined:true,
    optimizeAllPluginResources: true,  // text 插件配置
    modules:[
        {
            name:'main'
        },
    ],
    //out:'build/main.js',
    paths:{
        'jquery': 'lib/jquery/jquery.min',
        'jquery-cookie': 'lib/jquery-cookie/jquery.cookie',
        'angular': 'lib/angular/angular.min',
        'angular-ui-bootstrap': 'lib/angular-ui-bootstrap/ui-bootstrap-tpls',
        'angular-toggle-switch': 'lib/angular-toggle-switch/angular-toggle-switch.min',
        'angular-ui-select': 'lib/angular-ui-select/select.min',
        'angular-sanitize': 'lib/angular-sanitize/angular-sanitize.min',
        'bootstrap': "lib/bootstrap/js/bootstrap.min",
        'satellizer': 'lib/satellizer/satellizer.min',
        'bootstrap-treeview': 'lib/bootstrap-treeview/bootstrap-treeview.min',
        'github-api': 'lib/github-api/GitHub.bundle.min',
        'cropper': 'lib/cropper/cropper.min',
        'markdown-it':'lib/markdown-it/markdown-it.min',
        'highlight': 'lib/highlight/highlight.pack', 
        'js-base64': 'lib/js-base64/base64.min',
        'text': 'lib/requirejs/text',
        'domReady': 'lib/requirejs/domReady',

        // 自定义模块
        'app': 'app',
        'router': 'router',
        'preload': 'app/preload',

        // dir map
        'controller': 'app/controller',
        'directive': 'app/directive',
        'factory': 'app/factory',
        'helper': 'app/helper',
        // html dir
        'html': '../html'
    },
    shim: {
        'angular': {
            exports: 'angular',
        },
        'angular-ui-router':{
            deps:['angular'],
        },
        'angular-ui-bootstrap':{
            deps:['angular'],
        },
        'angular-ui-select':{
            deps:['angular'],
        },
        'angular-sanitize':{
            deps:['angular'],
        },
        'satellizer':{
            deps:['angular'],
        },
        'bootstrap':{
            deps:['jquery'],
        },
        'cropper':{
            deps:['jquery'],
        },
        'bootstrap-treeview': {
            deps:['bootstrap', 'jquery'],
        },
        'highlight':{
            exports: 'hljs',
        },
    },
    packages: [
        {
            name: "codemirror",
            location: "lib/codemirror",
            main: "lib/codemirror"
        },
    ],
    
    deps:[
        'controller/websiteController',
        'controller/newWebsiteController',
        'controller/editWebsiteController',
        'controller/wikiEditorController',
        'controller/gitVersionController',
        'controller/homeController',
        'controller/loginController',
        'controller/previewController',
        'controller/siteshowController',
        'controller/userCenterController',

        // directives
        //'directive/moduleDirective',

        // factory
        //'factory/account',
    ]
})
