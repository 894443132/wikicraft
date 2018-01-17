define([
    'app',
    'helper/util',
    'text!wikimod/adi/html/qq.html',
], function (app, util, htmlContent) {

    function registerController(wikiblock) {
        app.registerController("qqController", ['$scope','$sce', function ($scope, $sce) {
            $scope.editorMode = wikiblock.editorMode;

            initObj = {
                scope  : $scope,
                styles : [
                    {
                        "design": {
                            "text":"style1",
                            "cover":config.wikiModPath + 'adi/assets/images/qqOne.png'                         
                        },                        
                    },
                    {
                        "design": {
                            "text":"style2",
                            "cover":"/wiki/js/mod/adi/assets/images/qqTwo.png"
                        },
                    },
                   
                ],
                params_template : {
                    design:{
                        is_leaf      : true, 
                        type         : "text",   
                        editable     : false, 
                        is_mod_hide  : false,  
                        is_card_show : true,
                        name         : "样式",   
                        text         : "style1", 
                        require      : true, 
                    },
                    media_img:{
                        is_leaf      : true, 
						type         : "media",   
						mediaType    : "image",
                        editable     : true, 
						is_mod_hide  : false,  
						is_card_show : true,
                        name         : "图像",   
                        text         : config.wikiModPath + 'adi/assets/imgs/qqMod.png', 
                        href         : "", 
                    	require      : true, 
                    },
                    media_img_two:{
                        is_leaf      : true, 
                        type         : "media",   
                        mediaType    : "image",
                        editable     : true, 
                        is_mod_hide  : false,  
                        is_card_show : true,
                        name         : "图像",   
                        text         : config.wikiModPath + 'adi/assets/imgs/qqModTwo.png', 
                        href         : "", 
                        require      : true, 
                    },
				   	link_title:{
						is_leaf      : true, 
						type         : "link",   
						editable     : true, 
						is_mod_hide  : false,  
						is_card_show : true,
						name         : "文本：标题",   
						text         : "客服中心", 
						href         : "",
						require      : true, 
					},
                }
            }

            wikiblock.init(initObj);
            console.log($scope.params.design)
            // if($scope.params.design.text = "style1"){
            //     $scope.params.media_img_two.editablen = false;
            // }
            
            $scope.qqImg = {
				"background-image"    : 'url('+ $scope.params.media_img.text +')',
				"background-size"     : "cover",
				"background-position" : "center center",
			}
            
        }]);
    }

    return {
        render: function (wikiblock) {
            registerController(wikiblock);
            return htmlContent;
        },
        initObj: function(){
            return initObj;
        }
    }
});

