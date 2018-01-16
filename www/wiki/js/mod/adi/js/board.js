﻿define([
    'app',
    'helper/util',
    'text!wikimod/adi/html/board.html',
    'pako',
    'helper/mdconf',
    '/wiki/js/mod/adi/assets/board.min.js?bust=3',
], function (app, util, htmlContent, pako, mdconf) {
    jscolor.dir = "/wiki/js/mod/adi/assets/images/";

    var initEditor = function (wikiBlock, callback) {
        console.log(wikiBlock);
        // if (!mxClient.isBrowserSupported()) {
        //     document.querySelector("#mx-client").innerHTML("Browser is not supported!");
        // }

        // var mxClientHeight = $(window).height();
        // var mxClientWidth  = $("#mx-client").outerWidth();

        // $("#mx-client").css({
        //     "width"  : mxClientWidth + "px",
        //     "height" : mxClientHeight + "px",
        // });

        // mxResources.loadDefaultBundle = false;

        // var bundle = mxResources.getDefaultBundle(RESOURCE_BASE, mxLanguage) || mxResources.getSpecialBundle(RESOURCE_BASE, mxLanguage);

        // mxUtils.getAll([bundle, STYLE_PATH + '/default.xml'], function (xhr) {
        //     mxResources.parse(xhr[0].getText());

        //     var themes = new Object();
        //     themes[Graph.prototype.defaultThemeName] = xhr[1].getDocumentElement();

        //     var ui = new Board(new Editor(urlParams['chrome'] == '0', themes), document.querySelector("#mx-client"));

        //     if (data && data.replace(/[\ \r\n]+/g, "").length > 0 && data.replace(/[\ \r\n]+/g, "") != "blank") {
        //         doc = ui.editor.graph.getDecompressData(data);

        //         ui.editor.setGraphXml(doc.documentElement);
        //     }

        //     if (typeof (callback) == "function") {
        //         callback(ui);
        //     }

        // }, function () {
        //     document.querySelector("#mx-client").innerHTML = '<center style="margin-top:10%;">Error loading resource files. Please check browser console.</center>';
        // });
    }

    var initPreview = function (wikiBlock, callback) {
        console.log(wikiBlock);
        // if (!mxClient.isBrowserSupported()) {
        //     return "Browser is not supported!";
        // }

        // var container = document.createElement("div");

        // mxResources.loadDefaultBundle = false;

        // var bundle = mxResources.getDefaultBundle(RESOURCE_BASE, mxLanguage) || mxResources.getSpecialBundle(RESOURCE_BASE, mxLanguage);

        // mxUtils.getAll([bundle, STYLE_PATH + '/default.xml'], function (xhr) {
        //     mxResources.parse(xhr[0].getText());

        //     var themes = new Object();
        //     themes[Graph.prototype.defaultThemeName] = xhr[1].getDocumentElement();

        //     var graph = new Graph(container, null, null, null, themes);

        //     var mxGraphModelData;

        //     if (wikiBlock.modParams.diagram_board && wikiBlock.modParams.diagram_board.data) {
        //         var data = "<diagram version=\"0.0.1\">" + wikiBlock.modParams.diagram_board.data + "</diagram>";
        //         mxGraphModelData = graph.getDecompressData(data);
        //     }

        //     var decoder = new mxCodec(mxGraphModelData);
        //     var node    = mxGraphModelData.documentElement;

        //     graph.centerZoom = false;
        //     graph.setTooltips(false);
        //     graph.setEnabled(false);

        //     decoder.decode(node, graph.getModel());

        //     var svg = container.querySelector("svg");
        //     svg.style.backgroundImage = null;

        //     if (typeof (callback) == "function") {
        //         callback(container.innerHTML);
        //     }
        // });
    }

    function registerController(wikiBlock) {
        app.registerController("boardController", ['$scope', '$uibModal', '$sce', function ($scope, $uibModal, $sce) {
            $scope.editorMode = wikiBlock.editorMode;

            if (wikiBlock.editorMode) {
                var boardData = (wikiBlock.modParams.diagram_board && wikiBlock.modParams.diagram_board.data) ? wikiBlock.modParams.diagram_board.data : "";

                if (typeof(boardData) == "string" && boardData.length == 0 || boardData == "blank") {
                    $scope.preview = $sce.trustAsHtml("<div class=\"mx-client-start\">点击此处开始编辑</div>");
                    $scope.$apply();
                } else {
                    initPreview(wikiBlock, function (svg) {
                        $scope.preview = $sce.trustAsHtml(svg);
                        $scope.$apply();
                    });
                }
            } else {
                initPreview(wikiBlock, function (svg) {
                    $scope.preview = $sce.trustAsHtml(svg);
                    $scope.$apply();
                });
            }

            wikiBlock.init({
                scope  : $scope,
				styles : [],
				params_template : {
                    diagram_board:{
                        is_leaf      : true,
						type         : "diagram",
                        editable     : true,
						is_card_show : true,
						is_mod_hide  : false,
                        name         : "绘图板",
                        svg          : "",
                        compressData : "",
                    	require      : true,
                    },
                }
            });

            $scope.options = {
                "animation"      : true,
                "ariaLabeledBy"  : "title",
                "ariaDescribedBy": "body",
                "template"       : "<div id='mx-client'><div class='mx-client-close' ng-click='close()'>关闭</div></div>",
                "controller"     : "boardEditorController",
                "size"           : "lg",
                "openedClass"    : "mx-client-modal",
                "backdrop"       : "static",
                "keyboard"       : false,
                "resolve"        : {
                    "wikiBlock" : function(){
                        return wikiBlock;
                    }
                }
            }

            $scope.error   = function(){},
            $scope.success = function(ui){
                var compressData = ui.getCurrentCompressData().replace("<diagram version=\"0.0.1\">", "").replace("</diagram>", "");

                console.log(compressData);
                // var diagram_board = mdconf.jsonToMd({"diagram_board":{"data":compressData}});

                // if(compressData){
                //     wikiBlock.applyModParams(diagram_board);
                // }
            }

            console.log($scope.params);
        }])

        app.registerController("boardEditorController", ['$scope', '$uibModalInstance', 'wikiBlock', function ($scope, $uibModalInstance, wikiBlock) {
            $scope.close = function () {
                $uibModalInstance.close($scope.ui);
            }

            $scope.$watch('$viewContentLoaded', function(){
                setTimeout(function () {
                    initEditor(wikiBlock, function (ui) {
                        $scope.ui = ui;
                        $scope.$apply();
                    });
                }, 0)
            });
        }]);
    }

    return {
        render: function (wikiBlock) {
            registerController(wikiBlock);
            return htmlContent;
        },
    };
});