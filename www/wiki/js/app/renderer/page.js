define([
<<<<<<< HEAD
    'app',
=======
	'app',
	'helper/util',
>>>>>>> 63a59e76fe4787884a5ced92549757f424f80e9e
	"helper/toolbase",
	"renderer/mdconf",
	"renderer/markdown",
	"renderer/block",
	"renderer/template",
	'renderer/directive/wikiBlock',
	'renderer/directive/wikiBlockContainer',
	'renderer/directive/wikiImage',
	'renderer/directive/wikiLink',
<<<<<<< HEAD
], function(app, toolbase, mdconf, markdown, blockFactory, templateFactory){
    app.objects.mds = {};
    var instCount = 0;
	var mds = app.objects.mds;
    // 获取md
    function getMd(mdName) {
		//return app.get('app.md.' + mdName);
		mds[mdName] = mds[mdName] || {};
		return mds[mdName];
    }
=======
], function(
	app,
	util,
	toolbase,
	mdconf,
	markdown,
	blockFactory,
	templateFactory
){
	app.objects.mds = {};
	var instCount = 0;
	var mds       = app.objects.mds;

	// 获取md
	function getMd(mdName) {
		//return app.get('app.md.' + mdName);
		mds[mdName] = mds[mdName] || {};
		return mds[mdName];
	}
>>>>>>> 63a59e76fe4787884a5ced92549757f424f80e9e


	function md_link_render(obj) {
		var pageinfo = config.services.$rootScope.pageinfo;

		if (!pageinfo) {
			return; 
		}

		var href = obj.md.md_special_char_unescape(obj.link_href);
		var text = obj.md.md_special_char_unescape(obj.link_text);
		//console.log(obj);
		//console.log(href);
		var currentDataSource = dataSource.getDataSource(pageinfo.username,pageinfo.sitename);
		if (currentDataSource && href.indexOf("private_token=visitortoken") >=0 ) {
			href = href.replace('private_token=visitortoken','private_token=' + currentDataSource.getToken());
		}
		
		return '<wiki-link href="' + href + '">' + text + '<wiki-link>';
	}

	function md_image_render(obj) {
		var pageinfo = config.services.$rootScope.pageinfo;
		if (!pageinfo) {
			return; 
		}

		var href = obj.md.md_special_char_unescape(obj.image_href);
		var text = obj.md.md_special_char_unescape(obj.image_text);
		//console.log(obj);
		//console.log(href);
		var currentDataSource = dataSource.getDataSource(pageinfo.username,pageinfo.sitename);
		if (currentDataSource && href.indexOf("private_token=visitortoken") >=0 ) {
			href = href.replace('private_token=visitortoken','private_token=' + currentDataSource.getToken());
		}
		
		return '<img src="' + href + '" alt="' + text + '"/>';
	}

	function md_rule_override(md) {
		md.register_rule_render("a", md_link_render);
		md.register_rule_render("img", md_image_render);
	}
<<<<<<< HEAD
    // md 构造函数
    function mdwiki(options) {
		options = options || {};

        var mdName = "md" + instCount++;
		var encodeMdName = encodeURI(mdName);
        var md = getMd(mdName);

		app.mixin(md, toolbase);

        md.mdName = mdName;
        md.md = markdown(options);
        md.containerId = options.containerId;
        md.editor = options.editor;
		md.mode = options.mode || "normal";
        md.$scope = options.$scope;
		md.isBindContainer = false;
		md.use_template = options.use_template;
=======

	// md 构造函数
	function mdwiki(options) {	
		options = options || {};

		var mdName       = "md" + instCount++;
		var encodeMdName = encodeURI(mdName);
		var md           = getMd(mdName);

		md.mdName          = mdName;
		md.md              = markdown(options);
		md.containerId     = options.containerId;
		md.editor          = options.editor;
		md.mode            = options.mode || "normal";
		md.$scope          = options.$scope;
		md.isBindContainer = false;
		md.use_template    = options.use_template;
>>>>>>> 63a59e76fe4787884a5ced92549757f424f80e9e

		md_rule_override(md.md);

		md.template = templateFactory(undefined, md);

<<<<<<< HEAD
        md.setEditor = function(editor) {
            md.editor = editor;
        }

		md.bindContainer = function() {
			var $scope = options.$scope || app.ng_objects.$rootScope;
			var $compile = app.ng_objects.$compile;

			if (!md.isBindContainer && md.containerId && $('#' + md.containerId)) {
				$("#" + md.containerId).html($compile('<wiki-block-container class="wikiEditor" data-template="true" data-params="' + encodeMdName + '"></wiki-block-container>')($scope));
=======
		md.setEditor = function(editor) {
			md.editor = editor;
		}

		md.bindContainer = function() {
			var $scope = options.$scope || app.ng_objects.$rootScope;
			var html   = '<wiki-block-container class="wikiEditor" data-template="true" data-params="' + encodeMdName + '"></wiki-block-container>';

			if (!md.isBindContainer && md.containerId && $('#' + md.containerId)) {
				util.html("#" + md.containerId, html, $scope);

>>>>>>> 63a59e76fe4787884a5ced92549757f424f80e9e
				md.isBindContainer = true;
			}
		}

<<<<<<< HEAD
        // 渲染
        md.render = function (text, theme, isLoadTheme) {
			function _render(text, theme) {
				md.parse(text, theme);

				//console.log("-------render----------");
				md.template.render(function(){
					for(var i = 0; i < md.template.blockList.length; i++) {
						var block = md.template.blockList[i];
						block.render();
					}
				});

				md.template.$apply && md.template.$apply();
				//console.log(md.template);

				md.bindContainer();
				return '<wiki-block-container data-template="true" data-params="' + encodeURI(md.mdName) + '"></wiki-block-container>';
			}

			if (!isLoadTheme) {
				return _render(text, theme);
			}

			var pageinfo = app.ng_objects.$rootScope.pageinfo;
			if (pageinfo && pageinfo.pagename && pageinfo.pagename[0] != "_" ) {
				var currentDataSource = app.objects.dataSource.getDataSource(pageinfo.username,pageinfo.sitename);
				if (currentDataSource) {
					// get theme content
					currentDataSource.getRawContent({path:'/' + pageinfo.username + '/' + pageinfo.sitename + '/_theme' + config.pageSuffixName, isShowLoading:false}, function (content) {
						_render(text, content);
					}, function () {
						_render(text, theme);
					})
				} else {
					_render(text, theme);
				}
			} else {
				_render(text,theme);
			}
        }

		md.getBlockList = function() {
			return md.template.blockList;
		}

        md.parse = function (text, theme) {
			theme = theme || "";
			text = theme + '\n' + text;
			themeLineCount = theme.split("\n").length;

            var tokenList = md.md.parse(text);
            var blockList = md.template.blockList;
			var template = undefined;
            for (var i = 0; i < tokenList.length; i++) {
                var token = tokenList[i];
				var block = blockFactory(blockList[i], md);

				token.start = token.start - themeLineCount;
				token.end = token.end - themeLineCount;
=======
		md.getBlockList = function() {
			return md.template.blockList;
		}

		md.getEditorParams = function(modParams, params_template) {
			modParams = modParams || {};

			for (var key in params_template) {
				if (key == "design") {
					modParams.design = modParams.design || {};
					modParams.design.text = modParams.design.text || params_template[key].text;
				} else {
					modParams[key] = modParams[key] || {};
					modParams[key]["$data"] = params_template[key];
					modParams[key]["text"] = modParams[key]["text"] || params_template[key]["text"];
				}
			}
	
			return modParams;
		}

		md.parse = function (text, theme) {
			theme          = theme || "";
			text           = theme + '\n' + text;
			themeLineCount = theme.split("\n").length;

			var tokenList = md.md.parse(text);
			var blockList = md.template.blockList;
			var template  = undefined;

			for (var i = 0; i < tokenList.length; i++) {
				var token = tokenList[i];
				var block = blockFactory(blockList[i], md);

				token.start = token.start - themeLineCount;
				token.end   = token.end - themeLineCount;
>>>>>>> 63a59e76fe4787884a5ced92549757f424f80e9e

				block.setToken(token);

				blockList[i] = block;

<<<<<<< HEAD
				//console.log(blcok);
				if (md.use_template && block.isTemplate && md.template.match(block)) {
					template = block;
				}
            }

			var size = blockList.length;
=======
				if (md.use_template && block.isTemplate && md.template.match(block)) {
					template = block;
				}
			}

			var size = blockList.length;

>>>>>>> 63a59e76fe4787884a5ced92549757f424f80e9e
			for (var i = tokenList.length; i < size; i++) {
				blockList.pop();
			}

			md.template.setTemplate(template);

<<<<<<< HEAD
			//console.log(blockList);
            return blockList;
        }

		md.cursorActivity = function(cm) {
			var pos = this.editor.getCursor();
			var blockList = this.getBlockList();
			var block = undefined, tmp = undefined;
=======
			return blockList;
		}

		md.cursorActivity = function(cm) {
			var pos                = this.editor.getCursor();
			var blockList          = this.getBlockList();
			var block              = undefined
			var tmp                = undefined;
>>>>>>> 63a59e76fe4787884a5ced92549757f424f80e9e
			var moduleEditorParams = config.shareMap.moduleEditorParams;

			if (!moduleEditorParams) {
				return ;
			}

			for (var i = 0; i < blockList.length; i++) {
				tmp = blockList[i];
				if (pos.line >= tmp.token.start && pos.line < tmp.token.end) {
					block = tmp;
					break;
				}
			}
			if (!block || !block.isWikiBlock) {
				moduleEditorParams.setShowType("knowledge");
				return;
			}

			moduleEditorParams.setBlock(block);
		}

<<<<<<< HEAD
        return md;
    }

    return mdwiki;
=======
		// 渲染
		md.render = function (text, theme, isLoadTheme) {
			function _render(text, theme) {
				md.parse(text, theme);

				md.template.render(function(){
					for(var i = 0; i < md.template.blockList.length; i++) {
						var block = md.template.blockList[i];

						block.render();
					}
				});
				
				md.template.$apply && md.template.$apply();

				md.bindContainer();

				return '<wiki-block-container data-template="true" data-params="' + encodeMdName + '"></wiki-block-container>';
			}

			if (!isLoadTheme) {
				return _render(text, theme);
			}

			var pageinfo = app.ng_objects.$rootScope.pageinfo;

			if (pageinfo && pageinfo.pagename && pageinfo.pagename[0] != "_" ) {
				var currentDataSource = app.objects.dataSource.getDataSource(pageinfo.username, pageinfo.sitename);

				if (currentDataSource) {
					// get theme content
					var themePath = '/' + pageinfo.username + '/' + pageinfo.sitename + '/_theme' + config.pageSuffixName;

					currentDataSource.getRawContent({
						path          : themePath,
						isShowLoading : false
					}, function (content) {
						_render(text, content);
					}, function () {
						_render(text, theme);
					})
				} else {
					_render(text, theme);
				}
			} else {
				_render(text,theme);
			}
		}

		return md;
	}

	return mdwiki;
>>>>>>> 63a59e76fe4787884a5ced92549757f424f80e9e
})
