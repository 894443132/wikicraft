
define([
	'app',
	'helper/util',
	'text!wikimod/example/html/modEditComplex.html',
], function(app, util, htmlContent){

	function registerController(wikiblock) {
		app.registerController("modEditComplexController", ["$scope", function($scope){
			var initObj = {
				scope:$scope,
				styles:[
					{
						"design": {
							"text":"style1",
						},
					},
					{
						"design":{
							"text":"style2",
						},
					},
				],

				params_template: {
					design:{
						is_leaf: true, // 叶子对象默认填true
						type:"text",   // 地段类型
						editable:false, // 是否可以编辑
						is_show:false,  // 可视化是否显示 undefined取值editable
						name:"样式",   // 表单显示名
						text:"style1", // 默认值
						require: true, // 必填字段 没有使用默认值
                    },
                    menu:{
                        is_leaf: true,
                        type: "menu",
                        editable: true,
                        is_show: true,
                        name: "菜单",
                        require: true,
                        text: [{
                            id: 12332434,
                            name: '试图',
                            url: 'liyu/site/views',
                            children: [{
                                      id: 1342143252,
                                      name: '我的试图',
                                      url: 'liyu/site/views/mine',
                                      children: []
                            }]
                        }]
                    },
				   	title:{
						is_leaf: true, // 叶子对象默认填true
						type:"text",   // 地段类型
						editable:true, // 是否可以编辑
						is_show:true,  // 可视化是否显示 undefined取值editable
						name:"标题",   // 表单显示名
						text:"title", // 默认值
						require: true, // 必填字段 没有使用默认值(默认值得有)
					},
				   	subtitle:{
						is_leaf: true, // 叶子对象默认填true
						type:"text",   // 地段类型
						editable:true, // 是否可以编辑
						is_show:true,  // 可视化是否显示 undefined取值editable
						name:"子标题",   // 表单显示名
						text:"subtitle", // 默认值
						require: true, // 必填字段 没有使用默认值(默认值得有)
					},
				   	paragraphs:{
						is_leaf: true, // 叶子对象默认填true
						type:"text",   // 地段类型
						editable:true, // 是否可以编辑
						is_show:true,  // 可视化是否显示 undefined取值editable
						name:"段落",   // 表单显示名
						text:"paragraphs", // 默认值
						require: true, // 必填字段 没有使用默认值(默认值得有)
					},
				   	link:{
						is_leaf: true, // 叶子对象默认填true
						type:"link",   // 地段类型
						editable:true, // 是否可以编辑
						is_show:true,  // 可视化是否显示 undefined取值editable
						name:"链接",   // 表单显示名
						text:"href text", // 默认值
						href:"http://www.baidu.com", // 默认值
						require: true, // 必填字段 没有使用默认值(默认值得有)
					},
				   	image:{
						is_leaf: true, // 叶子对象默认填true
						type:"link",   // 地段类型
						editable:true, // 是否可以编辑
						is_show:true,  // 可视化是否显示 undefined取值editable
						name:"链接",   // 表单显示名
						text:"href text", // 默认值
						href:"http://www.baidu.com", // 默认值
						require: true, // 必填字段 没有使用默认值(默认值得有)
					},
					
					list:{
						is_leaf: true,
						type: "list",
						editable: true,
						is_show: true,
						require: true,
						name:"简单列表",
						list: [
							{
								is_leaf: true, // 叶子对象默认填true
								type:"link",   // 地段类型
								editable:true, // 是否可以编辑
								is_show:true,  // 可视化是否显示 undefined取值editable
								name:"链接",   // 表单显示名
								text:"href text", // 默认值
								href:"http://www.baidu.com", // 默认值
								require: true, // 必填字段 没有使用默认值(默认值得有)
							},
						]
					},
					object_list:{
						is_leaf: true,
						type: "list",
						editable: true,
						is_show: true,
						require: true,
						name:"对象列表",
						list: [
							{
								link: {
									is_leaf: true, // 叶子对象默认填true
									type:"link",   // 地段类型
									editable:true, // 是否可以编辑
									is_show:true,  // 可视化是否显示 undefined取值editable
									name:"链接",   // 表单显示名
									text:"href text", // 默认值
									href:"http://www.baidu.com", // 默认值
									require: true, // 必填字段 没有使用默认值(默认值得有)
								}
							},
						]
					},
				}
			}
			wikiblock.init(initObj);
			console.log($scope.params);
		}]);
	}

	return {
		render: function(wikiblock) {
			registerController(wikiblock);
			return htmlContent;
		}
	}
});
