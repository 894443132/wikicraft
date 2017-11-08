/**
 * Created by 18730 on 2017/9/25.
 */
define([
    "app",
    "qiniu",
    "helper/util",
    "text!html/bigfile.html"
], function (app, qiniu, util, htmlContent) {
    app.registerController("bigfileController", ["$scope", "$rootScope", function ($scope, $rootScope) {
        var qiniuBack;
        var uploadTotalSecond = 0;
        var fileUploadTime = 0;
        const biteToG = 1024*1024*1024;
        const ErrFilenamePatt = new RegExp('^[^\\\\/\*\?\|\<\>\:\"]+$');
        $scope.selectedType = "图片";
        $rootScope.isBigfileUploading = false;
        if((util.getPathname() !="/wiki/user_center")){
            $scope.isModal=true;
        }
        $scope.cancel = function (params) {
            if ($scope.uploadingFiles && $scope.uploadingFiles.length > 0 && !$scope.finishUploading){
                console.log("正在上传");
                var confirmObj = {
                    "title": "提示",
                    "confirmBtnClass": "btn-danger",
                    "theme": "danger",
                    "content": "还有文件正在上传，确定关闭窗口？"
                };
                if (params){
                    confirmObj.content = "还有文件正在上传，请完成后重试，或者打开新窗口操作";
                    confirmObj.cancelBtn = false;
                    confirmObj.confirmBtnClass = "";
                }
                config.services.confirmDialog(confirmObj, function () {
                    if (params){
                        return;
                    }
                    $scope.$dismiss(params);
                });
            }else{
                $scope.$dismiss(params);
            }
        };

        $scope.sizeTransfer = function (file) {
            if (file.filesize){
                return file.filesize;
            }
            if (!file.file || !file.file.size){
                return;
            }
            var filesize = file.file.size;
            if (filesize/1024/1024/1024 > 0.1){
                file.filesize = (filesize/biteToG).toFixed(2)+"GB";
                return file.filesize;
            }
            if (filesize/1024/1024 > 0.1){
                file.filesize = (filesize/1024/1024).toFixed(2) + "MB";
                return file.filesize;
            }
            file.filesize = (filesize/1024).toFixed(2) + "KB";
            return file.filesize;
        };

        var getFileByUsername = function () {
            util.post(config.apiUrlPrefix + "bigfile/getByUsername",{pageSize:100000}, function(data){
                data = data || {};
                $scope.filelist = data.filelist;
                $scope.filesCount = data.total;
            });
        };

        var getUserStoreInfo = function () {
            util.get(config.apiUrlPrefix+"bigfile/getUserStoreInfo", {}, function (result) {
                if (!result){
                    return;
                }
                $scope.storeInfo = {
                    "used": result.used / biteToG || 0,
                    "total": result.total / biteToG || 0,
                    "unUsed": (result.total - result.used) / biteToG
                };
            }, function (err) {
                console.log(err);
            }, false);
        };

        var getFinishTime = function (filesize, speed) {
            filesize = filesize || $scope.remainSize;
            speed = speed || $scope.speed || 0;
            if (speed <=0){
                $scope.finishTime = $scope.finishTime || "等待计算";
                $scope.remainTime = $scope.remainTime || "0秒";
                return;
            }
            var waitTime = filesize/speed;
            var finishTime = new Date(new Date().getTime() + parseInt(waitTime*1000));
            $scope.finishTime = fix(finishTime.getHours(), 2) + ":" + fix(finishTime.getMinutes(), 2);
            var remainTime = sToTime(waitTime, 1).split(":");
            $scope.remainTime = "";
            if (remainTime[0] != "0"){
                $scope.remainTime += remainTime[0] + "小时";
            }
            if (remainTime[1] != "0"){
                $scope.remainTime += remainTime[1] + "分";
            }
            if (remainTime[2] != "0"){
                $scope.remainTime += remainTime[2] + "秒";
            }

            // $scope.finishTime = sToTime(parseInt(finishSecond));
        };

        var isExceed = function (unUsed, uploadingSize) {
            if (!unUsed || !uploadingSize || unUsed > uploadingSize){
                return false;
            } else {
                config.services.confirmDialog({
                    "title": "空间不足",
                    "content": "网盘可用空间不足，无法上传！",
                    "cancelBtn": false
                }, function () {
                    return true;
                });
                return true;
            }
        };

        var fix = function (num, length) {
            length = length || 2;
            return ('' + num).length < length ? ((new Array(length + 1)).join('0') + num).slice(-length) : '' + num;
        };

        var sToTime = function (stime, fixNum) {
            fixNum = fixNum || 2;
            var h, m, s;
            h = fix(parseInt(stime / 3600), fixNum);
            stime = stime % 3600;
            m = fix(parseInt(stime / 60), fixNum);
            stime = stime % 60;
            s = fix(parseInt(stime), fixNum);
            return (h+":"+m+":"+s);
        };

        $scope.initQiniu = function(type){
            if (type !== "isUpdating" && !$scope.startUpdating){
                $scope.updatingFile = {};
            }
            if ($scope.finishUploading){
                $scope.uploadingFiles = [];
                $scope.totalTime = "";
                uploadTotalSecond = 0;
                $scope.remainSize = 0;
            }else if ($scope.finishUploading === false){
                return;
            }
            $scope.remainSize = $scope.remainSize|| 0;
            var qiniu = new QiniuJsSDK();
            var option = {
                "browse_button":"selectFileInput",
                "drop_element":"dropFile",
                "unique_names": true,
                "auto_start": false,
                "uptoken_url": '/api/wiki/models/qiniu/uploadToken',
                "domain": 'ov62qege8.bkt.clouddn.com',
                "chunk_size": "4mb",
                "filters":{},
                "init": {
                    'FilesAdded': function(up, files) {
                        var self = this;
                        var filelist = [];
                        var filesSize = 0;
                        var conflictSize = 0;
                        for (var i = 0; i < files.length; i++) {
                            filelist.push(files[i].name);
                            files[i].size = files[i].size || 0;
                            filesSize += files[i].size;
                        }
                        if ($scope.updatingFile && $scope.updatingFile._id){
                            $scope.remainSize = $scope.updatingFile.file.size;
                            if (isExceed($scope.storeInfo.unUsed * biteToG, $scope.uploadingSize)){
                                return;
                            }
                            $scope.uploadingFiles = files;
                            $scope.finishUploading = false;
                            $scope.startUpdating = true;
                            $rootScope.isBigfileUploading = true;
                            self.start();
                            return;
                        }
                        util.post(config.apiUrlPrefix + "bigfile/getByFilenameList", {filelist:filelist}, function(data){
                        	if (data.length > 0) {
                        	    var conflictFileName = [];
                        	    var contentHtml = '<p class="dialog-info-title">网盘中已存在以下文件，是否覆盖？</p>';
                        	    data.map(function (file) {
                                    conflictFileName.push(file.filename);
                                    contentHtml+='<p class="dialog-info"><span class="text-success glyphicon glyphicon-ok"></span> '+ file.filename +'</p>';
                                    conflictSize += file.size || 0;
                                });

                        	    if (isExceed($scope.storeInfo.unUsed * biteToG, (filesSize - conflictSize))){
                                    return;
                                }

                                config.services.confirmDialog({
                                    "title": "上传提醒",
                                    "contentHtml": contentHtml
                                }, function () {
                                    if (isExceed($scope.storeInfo.unUsed * biteToG, filesSize)){
                                        return;
                                    }
                                    $scope.storeInfo.unUsed -= filesSize/biteToG;
                                    $scope.uploadingFiles = $scope.uploadingFiles || [];
                                    $scope.uploadingFiles = $scope.uploadingFiles.concat(files);
                                    $scope.finishUploading = false;
                                    $scope.remainSize += filesSize;
                                    $rootScope.isBigfileUploading = true;
                                    // $scope.$apply();
                                    self.start();
                                }, function () {
                                    $scope.storeInfo.unUsed -= (filesSize - conflictSize)/biteToG;
                                    files = files.filter(function (file) {
                                        return conflictFileName.indexOf(file.name) < 0;
                                    });
                                    if(files.length > 0){
                                        $scope.uploadingFiles = $scope.uploadingFiles || [];
                                        $scope.uploadingFiles = $scope.uploadingFiles.concat(files);
                                        $scope.finishUploading = false;
                                        $rootScope.isBigfileUploading = true;
                                        $scope.remainSize += (filesSize - conflictSize);
                                        self.start();
                                    }
                                });
                        		return ;
                        	}
                            if (isExceed($scope.storeInfo.unUsed * biteToG, filesSize)){
                                return;
                            }
                            $scope.storeInfo.unUsed -= filesSize/biteToG;
                            $scope.uploadingFiles = $scope.uploadingFiles || [];
                            $scope.uploadingFiles = $scope.uploadingFiles.concat(files);
                            $scope.finishUploading = false;
                            $scope.remainSize += filesSize;
                            $rootScope.isBigfileUploading = true;
                        	self.start();
                        });
                    },
                    'BeforeUpload': function(up, file) {
                        $scope.uploadingFiles[file.id] = file;
                        // 每个文件上传前，处理相关的事情
                    },
                    'UploadProgress': function(up, file) {
                        $scope.uploadingFiles[file.id] = file;
                        var remainSize = $scope.remainSize - file.loaded;
                        getFinishTime(remainSize, file.speed);
                        if (file.speed <= 0){
                            return;
                        }
                        var waitTime = (file.size - file.loaded) / (file.speed);
                        file.waitTime = sToTime(waitTime);
                        util.$apply();
                    },
                    'FileUploaded': function(up, file, response) {
                        $scope.uploadingSize -= file.size;
                        var domain = up.getOption('domain');
                        var info = JSON.parse(response.response);
                        var hash = info.hash;

                        var params = {
                            filename:file.name,
                            domain:domain,
                            key:file.target_name,
                            size:file.size,
                            type:file.type,
                            hash:info.hash,
                            channel:"qiniu"
                        };

                        if ($scope.updatingFile && $scope.updatingFile._id){
                            params._id = $scope.updatingFile._id;
                            params.filename = $scope.updatingFile.filename;
                            util.post(config.apiUrlPrefix + 'bigfile/updateById', params, function(data){
                                data = data || {};
                                data.filename = params.filename;
                                $scope.updatingFile = {};
                                option.filters = {};
                                qiniuBack.destroy();
                                qiniuBack = qiniu.uploader(option);
                                // $scope.uploadingFiles[file.id].status = "success";
                                getFileByUsername();
                            }, function(err){
                                console.log(err);
                            });
                            $scope.startUpdating = false;
                            return;
                        }

                        util.post(config.apiUrlPrefix + 'bigfile/upload', params, function(data){
                            data = data || {};
                            data.filename = params.filename;
                            getFileByUsername();
                        }, function(){
                            util.post(config.apiUrlPrefix + "qiniu/deleteFile", {
                                key:params.key,
                            }, function (result) {
                                console.log(result);
                            }, function (err) {
                                console.log(err);
                            });
                        });
                    },
                    'Error': function(up, err, errTip) {
                        if ($scope.uploadingFiles && $scope.uploadingFiles[err.file.id]){
                            $scope.uploadingFiles[err.file.id].errTip = err.message + "(" + err.code + ")";
                        }
                        if (err.code == -601){
                            option.filters = {};
                            $scope.uploadingFiles = $scope.uploadingFiles || [];
                            $scope.uploadingFiles.push(err.file);
                            $scope.remainSize += err.file.size;
                            up.files.push(err.file);
                            up.start();
                            return;
                        }
                        //上传出错时，处理相关的事情
                    },
                    'UploadComplete': function() {
                        $scope.remainSize = 0;
                        $scope.remainTime = 0;
                        getFinishTime(0, 0);
                        //队列文件处理完毕后，处理相关的事情
                        getFileByUsername();
                        getUserStoreInfo();
                        $scope.finishUploading = true;
                        $rootScope.isBigfileUploading = false;
                        $scope.remainSize = 0;
                    }
                }
            };

            if ($scope.updatingFile && $scope.updatingFile._id){// 更新文件
                var type = $scope.updatingFile.file.type;
                var filenameSplit = $scope.updatingFile.filename.split(".");
                var fileExt = filenameSplit[filenameSplit.length - 1];
                var minTypes = [];
                minTypes.push({
                    "title": type,
                    "extensions": fileExt
                });

                option.multi_selection = false;
                option.filters = {
                    "prevent_duplicates": true,
                    "mime_types": minTypes
                };
            }
            if (qiniuBack){
                qiniuBack.destroy();
            }
            qiniuBack = qiniu.uploader(option);
        };

        var init = function () {
            if (!$scope.filelist){
                getFileByUsername();
            }
            if (!$scope.storeInfo){
                getUserStoreInfo();
            }
            // initQiniu();
        };
        $scope.$watch("$viewContentLoaded", init);

        function fileStop(file) {
            $scope.storeInfo.unUsed += file.size/biteToG;
            $scope.remainSize -= file.size;
            file.isDelete = true;
            file._start_at = file._start_at || new Date();
            qiniuBack.removeFile(file.id);
            if ($scope.updatingFile){
                $scope.startUpdating = false;
            }
            if (qiniuBack.files.length <=0){
                $scope.uploadingFiles = [];
                $scope.totalTime = "";
                $scope.remainSize = 0;
                getFinishTime(0, 0);
                uploadTotalSecond = 0;
            }else{
                getFinishTime();
            }
            qiniuBack.start();
        }

        $scope.stopUpload = function (file) {
            if (file.status == 4){
                fileStop(file);
                return;
            }
            if (file.status == 2){
                qiniuBack.stop();
            }
            config.services.confirmDialog({
                "title": "取消上传",
                "confirmBtnClass": "btn-danger",
                "theme": "danger",
                "content": "确定取消该文件上传吗？"
            }, function () {
                fileStop(file);
            }, function () {
                qiniuBack.start();
            });
        };

        $scope.deleteFile = function(files, index) {
            config.services.confirmDialog({
                "title":"删除文件",
                "confirmBtnClass":"btn-danger",
                "theme":"danger",
                "content":"确定删除文件吗？"
            },function(){
                if (!Array.isArray(files)){
                    var file = files;
                    file.index = index;
                    files = [];
                    files.push(file);
                }
                var fnList = [];
                var deleteFileSize = 0;
                for (var i=files.length -1; i >= 0;i--){
                    fnList.push((function (index) {
                        return function (finish) {
                            util.post(config.apiUrlPrefix + 'bigfile/deleteById', {_id:files[index]._id}, function (data) {
                                files[index].isDelete = true;
                                $scope.filesCount--;
                                deleteFileSize += files[index].file.size;
                                finish();
                            }, function (err) {
                                console.log(err);
                                finish();
                            });
                        }
                    })(i));
                }
                util.batchRun(fnList, function () {
                    $scope.storeInfo.unUsed += deleteFileSize/biteToG;
                });
            });
        };

        $scope.deleteFiles = function () {
            var deletingArr = $scope.filelist.filter(function (file) {
                return file.index >= 0 && !file.isDelete;
            });
            if (deletingArr.length <= 0){
                config.services.confirmDialog({
                    "title": "提示",
                    "content": "请至少选择一个要删除的文件！",
                    "cancelBtn": false
                }, function () {
                });
            }else{
                $scope.deleteFile(deletingArr);
            }
        };

        var changeFileName = function (file, filename, targetElem) {
            $scope.nameErr="";

            if (!filename || file == ""){
                targetElem.html(file.filename);
                config.services.confirmDialog({
                    "title": "重命名失败",
                    "content": "文件名不能为空！",
                    "cancelBtn": false
                }, function () {
                });
                return;
            }

            var newFileSplit = filename.split(".");
            var newExt = newFileSplit[newFileSplit.length-1];
            var oldFileSplit = file.filename.split(".");
            var oldExt = oldFileSplit[oldFileSplit.length-1];
            oldExt = oldExt.trim();
            if (newFileSplit.length <= 1){// 文件扩展名被删，补扩展名
                filename+="."+oldExt;
                newFileSplit.push(oldExt);
                newExt = oldExt;
            }
            if (file.filename == filename){
                targetElem.html(filename);
                return;
            }
            if (oldExt != newExt){// 文件扩展名被修改
                filename+="." + oldExt;
                newFileSplit.push(oldExt);
                targetElem.html(filename);
                newExt = oldExt;
            }

            util.post(config.apiUrlPrefix + "bigfile/getByFilenameList", {filelist:[filename]}, function(data){
                if (data.length > 0){
                    targetElem.html(file.filename);
                    config.services.confirmDialog({
                        "title": "重命名失败",
                        "content": "网盘中已存在该文件名！",
                        "cancelBtn": false
                    }, function () {
                    });
                }else{
                    util.post(config.apiUrlPrefix+"bigfile/changeFilename",{
                        "_id": file._id,
                        "filename": filename
                    }, function (result) {
                        file.filename = filename;
                    }, function (err) {
                        console.log(err);
                    });
                }
            });
        };

        $scope.updateFile = function (file) {
            if ($scope.uploadingFiles && $scope.uploadingFiles.length > 0 && !$scope.finishUploading){
                config.services.confirmDialog({
                    "title": "提示",
                    "content": "还有文件正在上传，请完成后重试，或者打开新窗口操作！",
                    "cancelBtn": false
                }, function () {
                    $("#activeUpload").tab("show");
                });
                return;
            }
            $scope.updatingFile = file;
            $("#activeUpload").tab("show");
            $scope.initQiniu("isUpdating");
        };
        
        var removeAllTags = function (str) {
            return str.replace(/<\/?(\w+)\s*[\w\W]*?>/g, '').replace(/^&nbsp;|&nbsp;$/g, '');
        };

        $scope.renameFile = function (file) {
            var targetFileId = file.file_id;
            var targetElem = $("#"+targetFileId);
            if (!targetElem){
                return;
            }
            targetElem.attr("contenteditable", "true");
            targetElem.focus();
            targetElem.unbind("blur").bind("blur", function () {
                var filename = targetElem.html();
                filename = filename.replace(/\n|<br>|&nbsp;/g, "").trim();
                if (!ErrFilenamePatt.test(filename)){
                    targetElem.html(file.filename);
                    config.services.confirmDialog({
                        "title": "重命名失败",
                        "content": '文件名不能包含下列任何字符：\\\\ / : * ? " < > |',
                        "cancelBtn": false
                    }, function () {
                    });
                    return;
                }
                changeFileName(file, filename, targetElem);
                targetElem.attr("contenteditable", "false");
            });
            targetElem.on("paste", function () { // contenteditable中粘贴会包含html结构
                setTimeout(function () {
                    targetElem.html(removeAllTags(targetElem.html()));
                });
            })
        };

        $scope.downloadFile = function (file) {
            util.get(config.apiUrlPrefix + "bigfile/getDownloadUrlById", {
                _id:file._id,
            }, function(data){
                if (data) {
                    var a = document.createElement('a');
                    var url = data;
                    a.href = url;
                    a.target = "_blank";
                    a.click();
                }
            });
        };

        $scope.insertFile = function (file) {
            var insertingFiles = [];
            insertingFiles.push(file);
            $scope.insertFiles(insertingFiles);
        };

        $scope.insertFiles = function (files) {
            if (!files){
                files = $scope.filelist.filter(function (file) {
                    return file.checkedIndex >= 0;
                });
            }

            if (files.length <= 0){
                config.services.confirmDialog({
                    "title": "提示",
                    "content": "请至少选择一个要插入的文件！",
                    "cancelBtn": false
                }, function () {
                });
            }else{
                $scope.cancel(files);
            }
        };

        $scope.insertFilesUrl = function () {
            $scope.insertFileUrlErr = "";
            var type = "";
            var url = $scope.insertUrl;
            var urlReg= /^(http|https):\/\//;
            if (!url){
                $scope.insertFileUrlErr = "请输入要插入的url地址！";
                return;
            }
            if (!urlReg.test(url)){
                $scope.insertFileUrlErr = "请输入正确的url地址！";
                return;
            }
            switch ($scope.selectedType){
                case "图片":
                    type = "image";
                    break;
                case "视频":
                    type = "video";
                    break;
                default:
                    break;
            }
            $scope.cancel({
                "type": type,
                "url": url
            });
        }
    }]);
    return htmlContent;
});