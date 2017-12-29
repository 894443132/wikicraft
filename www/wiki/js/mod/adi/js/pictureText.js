define([
    'app',
    'helper/util',
	'../js/title.js',
	'text!wikimod/adi/html/pictureText.html',
], function (app, util, title, htmlContent) {
	var initObj;

    function registerController(wikiblock) {
        app.registerController("pictureTextController", ['$scope','$sce', function ($scope, $sce) {
			$scope.$apply();

            initObj = {
				scope  : $scope,
				styles : [
					{
						"design": {
							"text":"style1",
						},
					},
					{
						"design": {
							"text":"style2",
						},
					},
				],
				params_template: {
					design:{
						is_leaf: true, // 叶子对象默认填true
						type:"text",   // 地段类型
						editable:false, // 是否可以编辑
                        is_card_show:false,  // 可视化是否显示 undefined取值editable
						name:"样式",   // 表单显示名
						text:"style1", // 默认值
						require: true, // 必填字段 没有使用默认值
					},
					pictureTextImg:{
                        is_leaf: true, // 叶子对象默认填true
                        type:"link",   // 地段类型
                        editable:true, // 是否可以编辑
                        is_card_show:true,  // 是否在adi中显示编辑
                        is_mod_hide:false,  // 在模块中是否隐藏
                        name:"picture",   // 表单显示名
                        text:"", // 默认值
                        href:"", // 默认值
                    	require: true, // 必填字段 没有使用默认值(默认值得有)
                    },
					spanOne:{
						is_leaf: true, // 叶子对象默认填true
						type:"text",   // 地段类型
						editable:true, // 是否可以编辑
						is_card_show:true,  // 是否在adi中显示编辑
                        is_mod_hide:false,  // 在模块中是否隐藏
						name:"文字说明",   // 表单显示名
						text:"YOUR ARTUCLE", // 默认值
						require: true, // 必填字段 没有使用默认值(默认值得有)
					},
					btn:{
                        is_leaf: true, // 叶子对象默认填true
                        type:"link",   // 地段类型
                        editable:true, // 是否可以编辑
                        is_card_show:true,  // 是否在adi中显示编辑
                        is_mod_hide:false,  // 在模块中是否隐藏
                        name:"按钮",   // 表单显示名
                        text:"点击", // 默认值
                        href:"", // 默认值
                    	require: true, // 必填字段 没有使用默认值(默认值得有)
                    },
				}
			}

			util.mergeParams(title.initObj(), initObj);
			
            wikiblock.init(initObj);
        }]);
    }

    return {
        render: function (wikiblock) {
            registerController(wikiblock);
            return title.render(wikiblock) + htmlContent;
		},
		initObj: function(){
			return initObj;
		},
    }
});