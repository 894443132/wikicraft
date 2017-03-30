/**
 * Created by wuxiangan on 2017/3/7.
 */

define(['app',
    'helper/util',
    'helper/storage',
    'text!html/userProfile.html',
    'cropper',
], function (app, util, storage, htmlContent) {
    app.registerController('userProfileController', ['$scope', 'Account', 'Message', function ($scope, Account, Message) {
        $scope.passwordObj = {};
        $scope.fansWebsiteId = "0";
        $scope.showItem = 'myProfile';
        $scope.totalItems = 0;
        $scope.currentPage = 1;
        $scope.pageSize = 5;

        //console.log("init userProfileController!!!");

        var innerGitlab = Account.innerGitlab;

        function init() {
            var changeBtn = $("#change-profile");
            var finishBtn = $("#finish");
            var cropper = $("#cropper");
            var dataForm = $("#data-form");

            $scope.fileUpload = function (e) {
                var file = e.target.files[0];
                // 只选择图片文件
                if (!file.type.match('image.*')) {
                    return false;
                }
                var reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = function (arg) {
                    if (!innerGitlab.isInited()) {
                        Message.info("内部数据源失效");
                        return;
                    }

                    innerGitlab.uploadImage({content:arg.target.result}, function (url) {
                        $scope.user.portrait = url;
                        $('#userPortraitId').attr('src', arg.target.result);
                        Message.info("图片上传成功")
                    }, function () {
                        Message.info("图片上传失败");
                    });
                    finishBtn.removeClass("sr-only");
                    cropper.removeClass("sr-only");
                    changeBtn.addClass("sr-only");
                    dataForm.addClass("sr-only")
                    var img = "<h4>修改头像</h4><img src='" + arg.target.result + "' alt='preview' />";
                    cropper.html(img);
                    var $previews = $('.preview');
                    $('#cropper > img').cropper({
                        aspectRatio: 1 / 1,
                        viewMode: 1,
                        dragMode: 'move',
                        autoCropArea: 0.65,
                        restore: false,
                        guides: false,
                        highlight: false,
                        cropBoxMovable: false,
                        cropBoxResizable: false,
                        build:function(){
                            var $clone = $(this).clone().removeClass('cropper-hidden');
                            $clone.css({
                                display: 'block',
                                width:"100%",
                                minWidth: 0,
                                minHeight: 0,
                                maxWidth: 'none',
                                maxHeight: 'none'
                            });

                            $previews.css({
                                overflow: 'hidden'
                            }).html($clone);
                        },
                        crop: function (e) {
                            var imageData = $(this).cropper('getImageData');
                            var previewAspectRatio = e.width / e.height;

                            $previews.each(function () {
                                var $preview = $(this);
                                var previewWidth = $preview.width();
                                var previewHeight = previewWidth / previewAspectRatio;
                                var imageScaledRatio = e.width / previewWidth;

                                $preview.height(previewHeight).find('img').css({
                                    width: imageData.naturalWidth / imageScaledRatio,
                                    height: imageData.naturalHeight / imageScaledRatio,
                                    marginLeft: -e.x / imageScaledRatio,
                                    marginTop: -e.y / imageScaledRatio
                                });
                            });
                        }
                    });
                }
            };
            finishBtn.on("click", function () {
                changeBtn.removeClass("sr-only");
                cropper.html("");
                cropper.addClass("sr-only");
                finishBtn.addClass("sr-only");
                dataForm.removeClass("sr-only");
            });
        }

        $scope.$on('userCenterSubContentType', function (event, item) {
            //console.log(item);
            if (item == 'myProfile')
                $scope.clickMyProfile();
            else if(item == 'accountSafe')
                $scope.clickAccountSafe();
            else if(item == 'myTrends')
                $scope.clickMyTrends();
            else if(item == 'myCollection')
                $scope.clickMyCollection();
            else if(item == 'myHistory')
                $scope.clickMyHistory();
            else if(item == 'myFans')
                $scope.clickMyFans();
            else if(item == 'realName')
                $scope.clickRealName();
            else if(item == 'invite')
                $scope.clickInvite();
        });

        // 文档加载完成
        $scope.$watch('$viewContentLoaded', init);

        // 保存用户信息
        $scope.saveProfile = function () {
            util.http("PUT", config.apiUrlPrefix + "user/updateUserInfo", $scope.user, function (data) {
                Account.setUser(data);
                Message.success("修改成功");
            });
        }

        // 修改密码
        $scope.modifyPassword = function () {
            console.log($scope.passwordObj);
            if ($scope.passwordObj.newPassword1 != $scope.passwordObj.newPassword2) {
                Message.info("两次新密码不一致!!!");
                return;
            }
            var params = {oldpassword: $scope.passwordObj.oldPassword, newpassword: $scope.passwordObj.newPassword1};
            util.http("POST", config.apiUrlPrefix + "user/changepw", params, function (data) {
                Message.success("密码修改成功");
            }, function (error) {
                Message.info(error.message);
            });
        }

        // 修改用户信息
        $scope.clickMyProfile = function () {
            $scope.showItem = 'myProfile';

        }

        // 账号安全
        $scope.clickAccountSafe = function () {
            $scope.showItem = 'accountSafe';
        }

        // 我的动态
        $scope.clickMyTrends = function () {
            $scope.showItem = 'myTrends';
            $scope.trendsType = "organization";
            getUserTrends();

            $scope.selectTrendsType = function (trendsType) {
                $scope.trendsType = trendsType;
            }

            function getUserTrends() {
                util.post(config.apiUrlPrefix + 'user_trends/get', {userId:$scope.user._id}, function (data) {
                    $scope.trendsList = data.trendsList;
                });
            }

            $scope.isShowTrend = function (trends) {
                var trendsTypeList = ["organization","favorite","works"];
                return  $scope.trendsType == trendsTypeList[trends.trendsType];
            }
        }

        // 我的收藏
        $scope.clickMyCollection = function () {
            $scope.showItem = 'myCollection';
            $scope.currentPage = 1;
            var isPersonalSite = true;

            function getSiteList(isPersonalSite, page) {
                var url = config.apiUrlPrefix + "user_favorite/getFavoriteUserListByUserId";
                var params = {userId: $scope.user._id, page: $scope.currentPage, pageSize: $scope.pageSize};
                if (!isPersonalSite) {
                    url = config.apiUrlPrefix + "user_favorite/getFavoriteWebsiteListByUserId";
                }

                util.post(url, params, function (data) {
                    $scope.totalItems = data.total;
                    $scope.favoriteList = data.favoriteList;
                });
            };

            $scope.clickCollectionUser = function () {
                console.log('clickCollectionUser');
                $scope.currentPage = 1;
                isPersonalSite = true;
                getSiteList(isPersonalSite, $scope.currentPage);
            };

            $scope.clickCollectionWorks = function () {
                console.log('clickCollectionWorks');
                $scope.currentPage = 1;
                isPersonalSite = false;
                getSiteList(isPersonalSite, $scope.currentPage);
            };

            $scope.collectionPageChanged = function () {
                getSiteList(isPersonalSite, $scope.currentPage);
            };

            $scope.clickCollectionUser();
        }

        // 我的历史
        $scope.clickMyHistory = function () {
            $scope.showItem = 'myHistory';
            util.http("POST", config.apiUrlPrefix + 'website/getHistoryListByUserId', {userId: $scope.user._id}, function (data) {
                $scope.siteList = data; // 用户的建站列表
            });
        }

        // 我的粉丝
        $scope.clickMyFans = function () {
            $scope.showItem = 'myFans';
            $scope.currentPage = 1;

            util.post(config.apiUrlPrefix + "website/getWebsiteListByUserId", {userId: $scope.user._id}, function (data) {
                $scope.siteList = data;
                $scope.totalFavoriteCount = 0;
                for (var i = 0; i < $scope.siteList.length; i++) {
                    $scope.totalFavoriteCount += $scope.siteList[i].favoriteCount;
                }
                if ($scope.siteList.length > 0) {
                    $scope.currentFansSite = $scope.siteList[0];
                    getFansList();
                }
            });

            function getFansList() {
                var params = {
                    userId: $scope.user._id,
                    websiteId: $scope.currentFansSite._id,
                    page: $scope.currentPage,
                    pageSize: $scope.pageSize
                };
                util.http("POST", config.apiUrlPrefix + "user_favorite/getFansListByUserId", params, function (data) {
                    $scope.totalItems = data.total;
                    $scope.fansList = data.fansList || [];
                });
            }

            $scope.selectFansSite = function (site) {
                $scope.currentFansSite = site;
                getFansList();
            }

            $scope.fansPageChanged = function () {
                getFansList();
            }
        }

        // 实名认证
        $scope.clickRealName = function () {
            $scope.showItem = 'realName';
        }

        // 邀请注册
        $scope.clickInvite = function () {
            $scope.showItem = 'invite';

            $scope.inviteFriend = function () {
                if (!$scope.friendMail) {
                    Message.info("请正确填写好友邮箱地址!!!");
                    return ;
                }
                util.post(config.apiUrlPrefix + 'user/inviteFriend',{userId:$scope.user._id,username:$scope.user.username,friendMail:$scope.friendMail}, function () {
                   Message.info("邀请好友邮件已发送^-^");
                });
            }
        }
   }]);

    return htmlContent;
});