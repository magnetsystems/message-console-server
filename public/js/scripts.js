$(document).ready(function(){
    $.fn.vAlign = function(){
        return this.each(function(i){
            var ah = $(this).height();
            var ph = $('html').height();
            var mh = Math.ceil((ph-ah) / 2);
            $(this).css('margin-top', mh-64);
        });
    };
    $.fn.vAlignRelative = function(){
        return this.each(function(i){
            var ah = $(this).height();
            var ph = $(this).parent().height();
            var mh = Math.ceil((ph-ah) / 2);
            $(this).css('margin-top', mh-12);
        });
    };
    adjustUI();
    $(window).resize(function(){
        adjustUI();
    });
    GetStartedNavigation();
    // user authentication
    var cookies = new Cookie();
    var formauth = new FormLogin(cookies);
    var ajaxauth = new AJAXLogin(cookies);
    var logout = new Logout(cookies);
    var confirmInvitation = new ConfirmInvitation(cookies, {
        token : getQuerystring('t'),
        type  : getQuerystring('s'),
        id    : getQuerystring('id')
    });
    var invitation = new Invitation(cookies);
    var startpwd = new StartResetPassword(cookies);
    var resetpwd = new ResetPassword(cookies, {
        token : getQuerystring('t')
    });
    var edit = new EditUserProfile(cookies);
    var register = new CompleteRegistration(cookies, {
        token : getQuerystring('t'),
        type  : getQuerystring('s'),
        id    : getQuerystring('id'),
        view  : getQuerystring('a')
    });
    var contact = new ContactForm();
    var userInvitation = new FriendInvitation();
    doAuth(cookies);
    $('#user-panel-toggle').click(function(e){
        e.preventDefault();
        var dom = $('#user-panel');
        if(dom.css('display') == 'block'){
            dom.slideUp('fast');
        }else{
            dom.slideDown('fast');
        }
    });
    $('.auth-btns').click(function(e){
        e.preventDefault();
        $('.modal.in').modal('hide');
        $('.modal_errors').hide();
        $('#'+$(this).attr('did')).modal('show');
    });
    $('.preauth-btns').click(function(e){
        e.preventDefault();
        switchView($(this).attr('did'));
    });
    // handle querystring parameters
    var view = getQuerystring('a');
    if(view){
        switchView(view);
    }
    view = getQuerystring('u');
    if(view){
        $('#'+view+'-container').modal('show');
    }
    var menus = $('.title_container .dropdown-menu');
    menus.each(function(){
        var menu = $(this);
        $(this).closest('.dropdown').unbind('mouseenter').mouseenter(function(){
            menu.css('display', 'block');
        }).unbind('mouseleave').mouseleave(function(){
            menu.css('display', 'none');
        });
    });
    var resources = new ResourceNavigation();
    var docFormatter = new DocFormatter();
    initPlaceholders();
    bindFeedbackButton();
    bindNews();
    bindWatchVideo();
    var docSearch = new DocSearch();
    //var tokens = window.location.href.indexOf('/profile/') != -1 ? new TokenManager() : undefined;
});

function adjustUI(){
    $('.valign').vAlign();
    $('.valign-relative').vAlignRelative();
    if($('.carousel').length > 0){
        $('#dev-home-carousel').carousel('pause');
        $('#dev-home-carousel .item .carousel-caption').each(function(){
            $(this).height($(this).closest('.item').height()+'px');
        });
        $('#dev-home-carousel .item.active .carousel-caption').height($('#dev-home-carousel .item.active img').height()+'px');
    }
    /*
    if($(window).width() < 900){
        $('.page[id!="login-container"][id!="invitation-container"]').css('top', '125px');
        $('.title_container').addClass('hidden');
        $('.title_container_mobile').removeClass('hidden');
    }else{
        $('.page[id!="login-container"][id!="invitation-container"]').css('top', '76px');
        $('.title_container').removeClass('hidden');
        $('.title_container_mobile').addClass('hidden');
    }
    */
    if($(window).width() < 810){
        $('.carousel-control').addClass('mob');
    }else{
        $('.carousel-control').removeClass('mob');;
    }
}

function bindFeedbackButton(){
    var div = $('#feedback-content');
    var complete = $('#feedback-complete');
    var error = $('#feedback-error');
    var btn = $('#feedback-btn');
    var submitBtn = $('#submit-feedback-btn');
    var loader = $('#feedback-content img');
    var isActive = false;
    var closed = {
        height  : 0,
        width   : 0,
        padding : 0,
        opacity : 0
    };
    div.each(function(){
        $.data(this, 'baseHeight', $(this).height());
        $.data(this, 'baseWidth', $(this).width());
        $('#leave-feedback-container').css('opacity', '1');
    }).css(closed);
    btn.toggle(function(){
        complete.hide('slow');
        error.hide('slow');
        div.animate({
            height  : div.data('baseHeight'),
            width   : div.data('baseWidth'),
            padding : '10px',
            opacity : 1
        }, 600);
    }, function(){
        complete.hide('slow');
        error.hide('slow');
        div.animate(closed, 600);
    });
    submitBtn.click(function(){
        var type = $('#feedback-type-field');
        var sub = $('#feedback-subject');
        var msg = $('#feedback-message');
        if(isActive === false && $.trim(msg.val()).length > 0){
            isActive = true;
            submitBtn.hide();
            loader.show();
            $.ajax({
                type        : 'POST',
                url         : '/rest/submitFeedback',
                data        : {
                    type : type.val(),
                    msg  : msg.val(),
                    sub  : sub.val()
                },
                contentType : 'application/x-www-form-urlencoded'
            }).done(function(){
                complete.show('slow');
            }).fail(function(){
                error.show('slow');
            }).always(function(){
                msg.val('');
                sub.val('');
                div.css(closed);
                isActive = false;
                submitBtn.show();
                loader.hide();
            });
        }
    });
}

function bindNews(){
    var otherNews = $('#latest-news .others');
    var btn =$('#open-more-news-btn');
    var on = false;
    $('#open-more-news-btn').click(function(e){
        e.preventDefault();
        if(on === true){
            on = false
            btn.html('More News <i class="icon-chevron-down icon-white"></i>');
            otherNews.hide();
        }else{
            on = true;
            btn.html('Less News <i class="icon-chevron-up icon-white"></i>');
            otherNews.show();
        }
    });
}

var ytVideoID;
var ytVideoPlayer;
function bindWatchVideo(){
    var ytVideoID;
    var $window = $(window);
    var videoContainer = $('#tutorialVideoContainer');
    var modal = $('#WatchVideoModal');
    var modalHeader = $('#WatchVideoModal .modal-header');
    var modalFooter = $('#WatchVideoModal .modal-footer');
    if(modal.length){
        $('#watchVideo').click(function(e){
            ytVideoID = $(this).attr('did');
            if(ytVideoID && ytVideoID.length > 1){
                modal.modal('show');
                window.onYouTubeIframeAPIReady = function(){
                    var videoContainer = $('#tutorialVideoContainer');
                    ytVideoPlayer = new YT.Player('tutorialVideoContainer', {
                        height  : videoContainer.height(),
                        width   : videoContainer.width(),
                        videoId : ytVideoID,
                        events  : {
                            'onReady' : function(event){
                                event.target.playVideo();
                            }
                        }
                    });
                }
                setTimeout(function(){
                    videoContainer.css('height', modal.height()-modalHeader.height()-modalFooter.height()-48);
                    var tag = document.createElement('script');
                    tag.src = "https://www.youtube.com/iframe_api";
                    var firstScriptTag = document.getElementsByTagName('script')[0];
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                }, 500);
            }
        });
        $window.resize(function(){
            setTimeout(function(){
                if(ytVideoID){
                    var videoContainer2 = $('#tutorialVideoContainer');
                    videoContainer2.css('width', modal.width());
                    videoContainer2.css('height', modal.height()-modalHeader.height()-modalFooter.height()-48);
                }
            }, 800);
        });
        modal.on('hidden', function(){
            ytVideoPlayer.stopVideo();
        });
    }
}

function switchView(view){
    $('.page[id!="dev-container"]').hide();
    $('#'+view+'-container').css('opacity', 1).css('height', 'auto').show();
    $('.valign').vAlign();
}

// check if user is logged in
function checkLogin(cookies){
    var user = cookies.get('magnet_auth');
    if((!user || user == null)){
        return false;
    }else{
        return user.split('|')[0] != 'undefined';
    }
}

function isLoggedIn(){
    return $('#user-panel-toggle').size() != 0;
}

function doAuth(cookies){
    if(window.location.pathname.indexOf('/login') == -1){
        // session timeout notification is disabled
        //var sessionMgr = new SessionManager(cookies);
        $(document).ajaxComplete(function(e, xhr){
            if(xhr.status == 278){
                window.location.href = '/login/';
            }else if(xhr.status == 279){
                window.location.href = '/login/?status=locked';
            }else{
                //sessionMgr.reset(true);
            }
        });
        getBeacon();
        if(checkLogin(cookies)){
            setProfile(cookies);
        }
    }else{
        //document.cookie = 'connect.sid=;domain=.'+window.location.hostname+';path=/';
        cookies.remove('magnet_auth');
    }
    if(!isLoggedIn()){
        var res = $('.protectedresource');
        var pop = $('#login-popup');
        res.after('<div class="protectedresourceinfo"> <i class="icon-lock"></i>Requires Sign In</div>');
        res.click(function(e){
            e.preventDefault();
            pop.find('.modal-header strong').show();
            pop.modal('show');
            setTimeout(function(){
                pop.find('#username').focus();
            }, 500);
        });
    }else{
        $('.protectedresourceinfo').remove();
    }
}

function getBeacon(){
    $.ajax({
        type  : 'GET',
        url   : '/beacon.json',
        cache : false
    });
}

// set profile
function setProfile(cookies){
    var user = cookies.get('magnet_auth');
    var profile = user.split('|');
    $('#username-placeholder').text(profile[0]);
    $('.user-username').html(profile[1]);
    $('.user-company').html(profile[2] == 'undefined' ? '' : profile[2]);
    $('#name-field').val(profile[1]);
    $('#email-field').val(profile[0]);
    $('.control-buttons').removeClass('hidden');
}

// get profile
function getProfile(cookies, callback){
    var me = this;
    $.ajax({  
        type        : 'GET',  
        url         : '/rest/users/@me/profile?_magnet_select=*',
        contentType : 'application/json'
    }).done(function(result, status, xhr){
        cookies.create('magnet_auth', result['eMails'][0]+'|'+result.firstName+' '+result.lastName+'|'+result.companyName, 1);
        if(typeof callback == typeof Function){
            callback();
        }
    });
}

// object to handle logout process
function Logout(cookies){
    var me = this;
    me.cookies = cookies;
    $('.btn-logout').click(function(e){
        e.preventDefault();
        me.call();
    });
}
Logout.prototype.call = function(){
    var me = this;
    $('.modal_errors').hide();
    $.ajax({
        type        : 'POST',  
        url         : '/rest/logout',  
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded'
    }).done(function(result, status, xhr){
        //document.cookie = 'connect.sid=;domain=.'+window.location.hostname+';path=/';
        me.cookies.remove('magnet_auth');
        window.location.href = '/login/';
    });
}
function FormLogin(cookies){
    var me = this;
    if($('#login-container').length){
        cookies.remove('magnet_auth');
        me.validator = new Validator('login-container');
        var status = getQuerystring('status');
        if(status){
            switch(status){
                case 'success':
                    var alert = $('#general-alert');
                    alert.modal('show');
                    alert.find('.modal-header h3').html('Registration Successful');
                    alert.find(' .modal-body p').html('Your registration has been completed successfully. Please sign in to start using the Developer Factory.');
                    break;
                case 'failed':
                    var alert = $('#error-alert');
                    alert.modal('show');
                    alert.find('.modal-header h3').html('Registration Failed');
                    alert.find('.modal-body p').html('A problem occurred during registration. Have you already registered? If so, try logging in. If you cannot log in,' +
                        ' your account may have been removed. Please contact Magnet support for assistance or create a new account.');
                    break;
                case 'invalid':
                    var alert = $('#login-container .modal_errors').show();
                    alert.find('strong').html('Incorrect Email Address and/or Password');
                    alert.find('span').html('Please check your input and try again.');
                    break;
                case 'locked':
                    var alert = $('#login-container .modal_errors').show();
                    alert.find('strong').html('Account Locked');
                    alert.find('span').html('Your account has been locked.');
                    break;
                case 'duplicate':
                    var alert = $('#general-alert');
                    alert.modal('show');
                    alert.find('.modal-header h3').html('Account Already Active');
                    alert.find('.modal-body p').html('This account is already active. You should be able to sign in now.');
                    break;
                default :
                    me.validator.showError('Invalid Credentials', 'Invalid email address or password.');
                    break;
            }
        }
        $('#btn-login').click(function(){
            return me.validator.validateLogin();
        });
    }
}
function AJAXLogin(cookies){
    var me = this;
    me.domId = 'login-popup';
    me.container = $('#'+me.domId);
    if(me.container.length){
        $('.show-login-popup').click(function(){
            me.container.find('.modal-header strong').hide();
            me.container.modal('show');
            setTimeout(function(){
                me.container.find('#username').focus();
            }, 500);
        });
        cookies.remove('magnet_auth');
        me.validator = new Validator(this.domId);
        $('#login-popup-btn').click(function(){
            me.validate();
        });
        me.container.find('input').keypress(function(e){
            if(e.keyCode == 13) me.validate();
        });
    }
}
AJAXLogin.prototype.validate = function(){
    var obj = {};
    this.container.find('input').each(function(){
        $(this).closest('.control-group').removeClass('error');
        obj[$(this).attr('name')] = $(this).val();
    });
    if(this.validator.validateLogin()){
        obj.authority = 'magnet';
        this.login(obj);
    }
}
AJAXLogin.prototype.login = function(obj){
    $('.modal_errors').hide();
    var me = this;
    startLoading(me.domId);
    $.ajax({
        type        : 'POST',
        url         : '/rest/login',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : obj
    }).done(function(){
        if(window.location.href.indexOf('/login') == -1)
            window.location.reload(true);
        else
            window.location.href = '/';
    }).fail(function(xhr){
        endLoading(me.domId);
        if(xhr.responseText == 'invalid-login')
            me.validator.showError('Incorrect Email Address and/or Password', 'Please check your input and try again.');
        else
            me.validator.showError('Account Locked', 'Your account has been locked.');
    });
}

// object to handle invitation process
function Invitation(cookies){
    var me = this;
    me.domId = 'invitation-container';
    me.validator = new Validator(me.domId);
    me.cookies = cookies;
    $('#'+me.domId+' input[name="firstName"]').focus(); 
    $('#btn-request-invitation').click(function(){
        me.request();
    });
    /*
    $('#'+me.domId+' input').keypress(function(e){
        if(e.keyCode == 13){
            me.request();
        }
    });
    */
}
Invitation.prototype.request = function(){
    var me = this;
    me.info = {};
    $('#'+me.domId+' input').each(function(){
        me.info[$(this).attr('name')] = $(this).val();
    });
    if(me.validator.validateInvitation()){
        delete me.info['password2'];
        me.info.authority = 'magnet';
        me.info.userName = me.info.email;
        me.call();
    }
}
Invitation.prototype.call = function(){
    $('.modal_errors').hide();
    var me = this;
    startLoading(me.domId);
    $.ajax({  
        type        : 'POST',  
        url         : '/rest/startRegistration',  
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : me.info
    }).done(function(){
        endLoading(me.domId, {
            title : 'Invitation Request Sent Successfully', 
            text  : 'Your request for an invitation has been sent successfully. An administrator will review your application and contact you through email.'
        });
        $('#'+me.domId+' .modal_errors, #btn-request-invitation').hide();
    }).fail(function(xhr){
        endLoading(me.domId);
        var msg = 'A server error occurred during registration. Please try again later.';
        switch(xhr.responseText){
            case 'invalid-email' : msg = 'The format of the email address you provided is invalid.'; break;
            case 'required-field-missing' : msg = 'A required field has been left blank.'; break;
            case 'captcha-failed' : msg = 'The Spam Protection validation has failed. Please try again.'; Recaptcha.reload(); break;
            case '"USER_ALREADY_EXISTS"' : msg = 'The email address you specified has already been taken.'; break;
        }
        me.validator.showError('Registration Failure', msg);
    });
}

function startLoading(id){
    $('#'+id+' .modal-footer').hide();
    $('#'+id+' .loading.modal-footer').show();
}
function endLoading(id, params){
    $('#'+id+' .modal-footer').show();
    $('#'+id+' .loading.modal-footer').hide();
    if(params){
        $('#'+id+' h4').html(params.title);
        $('#'+id+' .form-horizontal').hide();
        $('#'+id+' .subheading').html(params.text);
    }
}

// object to handle confirmation of an invitation
function ConfirmInvitation(cookies, params){
    var me = this;
    me.domId = 'confirm-introduce-container';
    me.params = params;
    me.cookies = cookies;
    me.validator = new Validator(me.domId);
    $('#'+me.domId+' input[name="firstName"]').focus();
    $('#btn-confirm-invitation').click(function(){
        me.request();
    });
    /*
    $('#'+me.domId+' input').keypress(function(e){
        if(e.keyCode == 13){
            me.request();
        }
    });
    */
}
ConfirmInvitation.prototype.request = function(){
    var me = this;
    me.info = {};
    $('#'+me.domId+' input').each(function(){
        me.info[$(this).attr('name')] = $(this).val();
    });
    if(me.params.token == false){
        me.validator.showError('Invalid Information', 'Invalid invitation information. Please contact Magnet support for assistance');
        $('#'+me.domId+' .row-fluid, #'+me.domId+' .modal-footer').hide();
    }else{
        if(me.validator.validateConfirmInvitation()){
            me.info.magnetId = me.params.token;
            me.call();
        }
    }
}
ConfirmInvitation.prototype.call = function(){
    $('.modal_errors').hide();
    var me = this;
    startLoading(me.domId);
    $.ajax({
        type        : 'POST',
        url         : '/rest/startRegistration',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : me.info
    }).done(function(status){
        var msg = {
            title : 'Invitation Confirmation Submitted Successfully',
            text  : 'Your invitation confirmation has been sent successfully. An administrator will review your application and contact you through email.'
        };
        if(status && status.indexOf('"skipAdminApproval": true') != -1){
            msg = {
                title : 'Invitation Confirmation Submitted Successfully',
                text  : 'Your invitation confirmation has been sent successfully. An email has been sent to the email address you provided. Please check your email and click on the link to complete the registration process.'
            }
        }
        endLoading(me.domId, msg);
        $('#'+me.domId+' .modal_errors, #btn-confirm-invitation').hide();
    }).fail(function(xhr){
        endLoading(me.domId);
        var msg = 'A server error occurred during invitation confirmation. Please try again later.';
        if(xhr.responseText.indexOf('REGISTRATION_FAILED') != -1){
            me.validator.showError('Confirmation Failure', 'A problem occurred during registration. Have you already registered? If so, try logging in. If you cannot log in,' +
            ' your account may have been removed. Please contact Magnet support for assistance or create a new account.');
        }else if(xhr.responseText.indexOf('USER_ALREADY_EXISTS') != -1){
            me.validator.showError('Confirmation Failure', 'This email address has already been taken. Please try another email address. If you own this email address, you may already have an account. Click on "Return to Login" and try to log in.');
        }else{
            me.validator.showError('Confirmation Failure', msg);
        }
    });
}

// object to handle friend invitation process
function FriendInvitation(){
    var me = this;
    me.domId = 'invite-other-modal';
    me.validator = new Validator(me.domId);
    $('#invite-others').click(function(){
        $('#invite-other-modal').modal('show');
        $('#'+me.domId+' input[name="user-invite-email"]').focus();
    });
    $('#'+me.domId+' .btn-primary').click(function(){
        me.invite();
    });
    /*
    $('#'+me.domId+' input').keypress(function(e){
        if(e.keyCode == 13){
            me.invite();
        }
    });
    */
}
FriendInvitation.prototype.invite = function(){
    var me = this;
    me.info = {};
    $('#'+me.domId+' input, #'+me.domId+' textarea').each(function(){
        me.info[$(this).attr('name')] = $(this).val();
    });
    if(me.validator.validateUserInvitation()){
        me.call();
    }
}
FriendInvitation.prototype.call = function(){
    $('.modal_errors').hide();
    var me = this;
    startLoading(me.domId);
    $.ajax({
        type        : 'POST',
        url         : '/rest/userInviteUser',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : me.info
    }).done(function(data, status, xhr){
        endLoading(me.domId);
        $('#'+me.domId+' input').val('');
        $('#'+me.domId+' textarea').val('I found this great new tool to quickly create mobile apps for me.');
        $('#'+me.domId+' .modal_success').show('fast', function(){
            var display = $(this);
            setTimeout(function(){
                display.hide('slow');
            }, 5000);
        });
        $('#'+me.domId+' .modal_errors').hide();
    }).fail(function(xhr){
        endLoading(me.domId);
        var msg = 'A user by this email address already exists.';
        if(xhr.status == 500){
            var res = tryParseJSON(xhr.responseText);
            if(res && res.message){
                msg = res.message;
            }
        }
        me.validator.showError('User Invitation Failure', msg);
    });
}

// registration object to handle registration process
function CompleteRegistration(cookies, params){
    var me = this;
    me.params = params;
    me.domId = 'confirm-registration-container';
    me.validator = new Validator(me.domId);
    me.cookies = cookies;
    if(me.params.view == 'confirm-registration'){
        if(me.params.token == false){
            me.validator.showError('Invalid Registration', 'Invalid registration information. Have you already been approved? Please contact Magnet support for assistance');
            $('#'+me.domId+' .row-fluid, #'+me.domId+' .modal-footer').hide();
        }else{
            if(me.params.type && me.params.type == 'u'){
                $('#'+me.domId+' .optional').remove();
                me.getEmail(me.params.token, function(email){
                    $('#confirm-registration-email').html('<div class="row-fluid"><div class="span12"><input type="text" class="span12" name="email" value="'+email+'" disabled="disabled"></div></div>');
                });
            }else{
                me.getEmail(me.params.token, function(email){
                    $('#confirm-registration-email').html('<div class="row-fluid"><div class="span12"><input type="text" class="span12" name="email" value="'+email+'" disabled="disabled"></div></div>');
                });
                $('#'+me.domId+' input[name="firstName"]').focus();
            }
            $('#btn-complete-registration').click(function(){
                me.register();
            });
            /*
             $('#'+me.domId+' input').keypress(function(e){
             if(e.keyCode == 13){
             me.register();
             }
             });
             */
        }
    }
}
CompleteRegistration.prototype.register = function(){
    var me = this;
    me.info = {};
    $('#'+me.domId+' input[name!="email"], #'+me.domId+' select').each(function(){
        me.info[$(this).attr('name')] = $(this).val();
    });
    if(me.params.token == false){
        me.validator.showError('Invalid Registration', 'Invalid registration information. Have you already been approved? Please contact Magnet support for assistance');
        $('#'+me.domId+' .row-fluid, #'+me.domId+' .modal-footer').hide();
    }else if(me.info['password'] != me.info['password2']){
        me.validator.showError('Password Doesn\'t Match', 'The re-typed password doesn\'t match the original.');
    }else if(me.validator.validateRegistration()){
        delete me.info['password2'];
        $('#confirm-tos-dialog').modal('show');
        $('#agree-to-tos').click(function(){
            $('#confirm-tos-dialog').modal('hide');
            me.call();
            $(this).unbind('click');
        });
    }
}
CompleteRegistration.prototype.call = function(){
    $('.modal_errors').hide();
    var me = this;
    startLoading(me.domId);
    $.ajax({  
        type        : 'POST', 
        url         : '/rest/users/'+me.params.token+'/completeRegistration',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : me.info
    }).done(function(){
        endLoading(me.domId);
        $('.modal.in').modal('hide');
        $('.modal_errors').hide();
        window.location.href = '/login/?status=success';
    }).fail(function(xhr){
        endLoading(me.domId);
        var msg = 'A problem occurred during registration. Have you already registered? If so, please click on the "Return to Login" button below and try logging in.';
        if(xhr.responseText == '"USER_DOES_NOT_EXIST"'){
            msg = 'A problem occurred during registration. Have you already registered? If so, try logging in. If you cannot log in, your account may have been removed. Please contact Magnet support for assistance or create a new account.';
        }
        if(msg.indexOf('invit_req_pending') != -1 || msg.indexOf('finish') != -1 || msg.indexOf('failed') != -1){
            endLoading(me.domId);
            $('.modal.in').modal('hide');
            $('.modal_errors').hide();
            window.location.href = '/login/?status=failed';
        }else{
            me.validator.showError('Registration Failure', msg);
        }
    });
}
CompleteRegistration.prototype.getEmail = function(token, callback){
    $.ajax({
        type        : 'GET',
        url         : '/rest/users/'+token,
        dataType    : 'json'
    }).done(function(data){
        if(data.state == 'failed'){
            window.location.href = '/login/?status=failed';
        }else if(data.state == 'finish'){
            window.location.href = '/login/?status=duplicate';
        }else{
            callback(data.email);
        }
    }).fail(function(){
        location.href = '/login/?status=failed';
    });
}

// registration object to handle registration process
function StartResetPassword(cookies){
    var me = this;
    me.captcha = new CAPTCHA('#captcha-pwd', 5);
    me.domId = 'start-reset-password-container';
    me.validator = new Validator(me.domId);
    me.cookies = cookies;
    $('#btn-start-reset-password').click(function(){
        me.reset();
    });
    /*
    $('#'+me.domId+' input').keypress(function(e){
        if(e.keyCode == 13){
            me.reset();
        }
    });
    */
}
StartResetPassword.prototype.reset = function(){
    var me = this;
    me.info = {};
    $('#'+me.domId+' input').each(function(){
        me.info[$(this).attr('name')] = $(this).val();
    });
    if(!me.captcha.check($('#'+me.domId+' input[name="captcha"]').val())){
        me.validator.showError('Invalid Security Code', 'The security code you entered was incorrect.');
        me.captcha.gen();
    }else if(me.validator.validateStartResetPassword()){
        delete me.info['captcha'];
        me.call();
    }
}
StartResetPassword.prototype.call = function(){
    $('.modal_errors').hide();
    var me = this;
    startLoading(me.domId);
    $.ajax({  
        type        : 'POST', 
        url         : '/rest/forgotPassword',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : me.info
    }).done(function(){
        endLoading(me.domId, {
            title : 'Password Reset Email Sent', 
            text  : 'Your request to reset password has been sent successfully. Check your email for further instructions.'
        });
        $('.modal.in').modal('hide');
        $('.modal_errors').hide();
        $('#'+me.domId+' .modal_errors, #btn-start-reset-password').hide();
    }).fail(function(xhr){
        endLoading(me.domId);
        var msg = 'We cannot find this email address in our records.';
        if(xhr.status == 500){
            var res = tryParseJSON(xhr.responseText);
            if(res && res.message){
                msg = res.message.replace('and authority magnet', '');
            }
        }
        me.validator.showError('Password Reset Failure', msg);
    });
}

// registration object to handle registration process
function ResetPassword(cookies, params){
    var me = this;
    me.params = params;
    me.domId = 'reset-password-container';
    me.validator = new Validator(me.domId);
    me.cookies = cookies;
    $('#btn-reset-password').click(function(){
        me.reset();
    });
    /*
    $('#'+me.domId+' input').keypress(function(e){
        if(e.keyCode == 13){
            me.reset();
        }
    });
    */
}
ResetPassword.prototype.reset = function(){
    var me = this;
    me.info = {};
    $('#'+me.domId+' input').each(function(){
        me.info[$(this).attr('name')] = $(this).val();
    });
    if(me.params.token == false){
        me.validator.showError('Invalid Information', 'Invalid password reset information. Try to copy and paste the url specified in the password reset email into your web browser.');
        $('#'+me.domId+' .row-fluid, #'+me.domId+' .modal-footer').hide();
    }else if(me.info['password'] != me.info['password2']){
        me.validator.showError('Password Doesn\'t Match', 'The re-typed password doesn\'t match the original.');
    }else if(me.validator.validateResetPassword()){
        delete me.info['password2'];
        me.info.passwordResetToken = me.params.token;
        me.call();
    }
}
ResetPassword.prototype.call = function(){
    $('.modal_errors').hide();
    var me = this;
    startLoading(me.domId);
    $.ajax({  
        type        : 'POST', 
        url         : '/rest/resetPassword',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : me.info
    }).done(function(){
        endLoading(me.domId, {
            title : 'Password Reset Successfully', 
            text  : 'Your password has been reset successfully. '
        });
        $('.modal.in').modal('hide');
        $('.modal_errors').hide();
        $('#'+me.domId+' .modal_errors, #btn-reset-password').hide();
    }).fail(function(xhr){
        endLoading(me.domId);
        var msg = 'A server error occurred during password reset. Please try again later.';
        if(xhr.status == 500){
            var res = tryParseJSON(xhr.responseText);
            if(res && res.message){
                msg = res.message;
            }
        }
        me.validator.showError('Password Reset Failure', msg);
    });
}



// edit user profile
function EditUserProfile(cookies){
    var me = this;
    me.domId = 'user-profile-container';
    me.validator = new Validator(me.domId);
    me.cookies = cookies;
    $('#profile-save').click(function(){
        me.save();
    });
}
EditUserProfile.prototype.save = function(){
    var me = this, data = {}, errorModal = $('#error-alert');
    $('#'+me.domId+' input').each(function(){
        if($(this).attr('name') != 'userName'){
            data[$(this).attr('name')] = $(this).val();
        }
    });
    if(me.hasPassword(data) && data.newpassword != data.newpassword2){
        errorModal.modal('show');
        errorModal.find('.modal-header h3').html('Password Doesn\'t Match');
        errorModal.find(' .modal-body p').html('The re-typed password doesn\'t match the original.');
        return false;
    }
    me.call(data);
}
EditUserProfile.prototype.hasPassword = function(data){
    return ($.trim(data.oldpassword).length != 0) && ($.trim(data.newpassword).length != 0);
}

EditUserProfile.prototype.call = function(data){
    var me = this, generalModal = $('#general-alert'), errorModal = $('#error-alert');
    $.ajax({
        type        : 'PUT',
        url         : '/rest/profile',
        dataType    : 'html',
        data        : data
    }).done(function(){
        generalModal.modal('show');
        generalModal.find('.modal-header h3').html('Profile Updated Successfully');
        generalModal.find(' .modal-body p').html('Your profile has been updated successfully.');
        $('#'+me.domId).find('input[type="password"]').val('');
    }).fail(function(xhr){
        var message = 'There was a generic error. Please try again later.';
        message = xhr.responseText == 'old-pass-not-match' ? 'The old password you entered was not correct.' : message;
        generalModal.modal('show');
        generalModal.find('.modal-header h3').html('Error Updating Profile');
        generalModal.find(' .modal-body p').html(message);
    });
};

// contact object to handle contact form request process
function ContactForm(){
    var me = this;
    me.validator = new Validator('contact-form');
    $('#send-contact').click(function(){
        me.contact();
    });
    $('#contact-form input').keypress(function(e){
        if(e.keyCode == 13)
            me.contact();
    });
}
ContactForm.prototype.contact = function(){
    var me = this;
    me.info = {};
    $('#contact-form input, #contact-form select, #contact-form textarea').each(function(){
        me.info[$(this).attr('name')] = $(this).val();
    });
    if(me.validator.validateContactForm()){
        me.call();
    }
}
ContactForm.prototype.call = function(){
    var me = this;
    me.validator.hideError();
    $.ajax({  
        type        : 'POST',  
        url         : '/rest/submitFeedback',
        dataType    : 'html',
        data        : me.info
    }).done(function(result, status, xhr){
        $('#contact-form .well').html('<h4>Contact Us</h4><p class="subheading">Thank you for submitting your contact request. A Magnet representative will follow up with you shortly.</p>');
        $('#contact-form input, #contact-form textarea').val('');
    }).fail(function(xhr){
        var msg = 'A server error occurred sending out the contact request. Please try again later.';
        switch(xhr.responseText){
            case 'invalid-email' : msg = 'The format of the email address you provided is invalid.'; break;
            case 'required-field-missing' : msg = 'A required field has been left blank.'; break;
            case 'captcha-failed' : msg = 'The Spam Protection validation has failed. Please try again.'; Recaptcha.reload(); break;
        }
        me.validator.showError('Contact Request Failure', msg);
    });
}

/* VALIDATORS */

function EmailValidator(){
    // bind this to _local for anonymous functions
    var _local = this;
    // modal window to allow users to request credentials by email
	_local.retrievePassword = $('#get-credentials');
	_local.retrievePassword.modal({
        show     : false, 
        keyboard : true, 
        backdrop : true
    });
	_local.retrievePasswordAlert = $('#get-credentials .alert');
	_local.retrievePassword.on('show', function(){ 
        $('#get-credentials-form').resetForm();
        _local.retrievePasswordAlert.hide();
    });
}
EmailValidator.prototype.validateEmail = function(e){
	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(e);
}
EmailValidator.prototype.showEmailAlert = function(m){
	this.retrievePasswordAlert.attr('class', 'alert alert-error');
	this.retrievePasswordAlert.html(m);
	this.retrievePasswordAlert.show();
}
EmailValidator.prototype.hideEmailAlert = function(){
    this.retrievePasswordAlert.hide();
}
EmailValidator.prototype.showEmailSuccess = function(m){
	this.retrievePasswordAlert.attr('class', 'alert alert-success');
	this.retrievePasswordAlert.html(m);
	this.retrievePasswordAlert.fadeIn(500);
}

// validate and display error messages prior to form submission
function Validator(domId){
    this.domId = domId;
}
Validator.prototype.showError = function(t, m){
    $('#'+this.domId+' .modal_errors strong').text(t+': ');
    $('#'+this.domId+' .modal_errors span').text(m);
    $('#'+this.domId+' .modal_errors').hide().slideDown('fast');
}
Validator.prototype.hideError = function(){
    $('#'+this.domId+' .modal_errors').hide()
}
Validator.prototype.validateLogin = function(){
    var user = $('#'+this.domId+' #username');
    var pass = $('#'+this.domId+' #password');
	if(user.val() == ''){
		this.showError('Required Field Missing', 'Please enter a valid email address');
        user.closest('.control-group').addClass('error');
		return false;
	}else if(pass.val() == ''){
		this.showError('Required Field Missing', 'Please enter a valid password');
        pass.closest('.control-group').addClass('error');
		return false;
	}else{
		return true;
	}
}
Validator.prototype.validateRegistration = function(){
    var me = this;
    var valid = true;
    $('#confirm-registration-container input[name!="email"], #confirm-registration-container select').each(function(){
        if(($.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder'))){
            me.showError('Required Field Missing', 'Please enter a '+$(this).attr('placeholder'));
            valid = false;
        }
    });
    if($.trim($('#confirm-registration-container input[type="password"]').val()).length < 6){
        me.showError('Invalid Password Length', 'Password must be at least 6 characters in length.');
        valid = false;
    }
	return valid;
}
Validator.prototype.validateInvitation = function(){
    var me = this;
    var valid = true;
    $('#invitation-container input[name!="captcha"]').each(function(){
        if($(this).attr('id') != 'recaptcha_response_field' && $.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder')){
            me.showError('Required Field Missing', 'Please enter a '+$(this).attr('placeholder'));
            valid = false;
        }
    });
    var emailRxp = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
    if(!emailRxp.test($('#invitation-container input[name="email"]').val())){
        me.showError('Invalid Email Address', 'The format of the email address you provided is invalid.');
        valid = false;
    }
    return valid;
}
Validator.prototype.validateConfirmInvitation = function(){
    var me = this;
    var valid = true;
    $('#confirm-introduce-container input[name!="captcha"]').each(function(){
        if($.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder')){
            me.showError('Required Field Missing', 'Please enter a '+$(this).attr('placeholder'));
            valid = false;
        }
    });
    var emailRxp = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
    if(!emailRxp.test($('#confirm-introduce-container input[name="email"]').val())){
        me.showError('Invalid Email Address', 'The format of the email address you provided is invalid.');
        valid = false;
    }
    return valid;
}
Validator.prototype.validateUserInvitation = function(){
    var me = this;
    var valid = true;
    var emailRxp = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
    if(!emailRxp.test($('#invite-other-modal input[name="email"]').val())){
        me.showError('Invalid Email Address', 'The format of the email address you provided is invalid.');
        valid = false;
    }
    return valid;
}
Validator.prototype.validateStartResetPassword = function(){
    var me = this;
    var valid = true;
    $('#start-reset-password-container input[name!="captcha"]').each(function(){
        if($.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder')){
            me.showError('Required Field Missing', 'Please enter a '+$(this).attr('placeholder'));
            valid = false;
        }
    });
    var emailRxp = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
	if(!emailRxp.test($('#start-reset-password-container input[name="email"]').val())){
        me.showError('Invalid Email Address', 'The format of the email address you provided is invalid.');
        valid = false;
    }
	return valid;
}
Validator.prototype.validateResetPassword = function(){
    var me = this;
    var valid = true;
    $('#reset-password-container input[name!="captcha"]').each(function(){
        if($.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder')){
            me.showError('Required Field Missing', 'Please enter a '+$(this).attr('placeholder'));
            valid = false;
        }
    });
	return valid;
}
Validator.prototype.validateContactForm = function(){
    var me = this;
    var valid = true;
    var form = $('#contact-form');
    form.find('input, select, textarea').each(function(){
        if($(this).attr('id') != 'recaptcha_response_field' && $.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder')){
            me.showError('Required Field Missing', 'Please enter a '+$(this).attr('placeholder'));
            valid = false;
        }
    });
    var emailRxp = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
    if(!isLoggedIn() && !emailRxp.test($('#contact-form').find('input[name="emailaddress"]').val())){
        me.showError('Invalid Email Address', 'The format of the email address you provided is invalid.');
        valid = false;
    }
	return valid;
}

// cookie management 
function Cookie(){}
Cookie.prototype.create = function(name, val, days){
    if(days){
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = '; expires=' + date.toGMTString();
    }else{
        var expires = '';
    }
    document.cookie = escape(name) + '=' + escape(val) + expires + '; path=/';
}
Cookie.prototype.get = function(name){
    var nameEQ = escape(name) + '=';
    var ca = document.cookie.split(';');
    for(var i=0;i<ca.length;i++){
        var c = ca[i];
        while(c.charAt(0) == ' '){
            c = c.substring(1, c.length)
        };
        if(c.indexOf(nameEQ) == 0){
            return unescape(c.substring(nameEQ.length, c.length))
        }
    }
    return null;
}
Cookie.prototype.remove = function(name){
    this.create(name, "", -1);
}

// get querystring parameters based on attribute name
function getQuerystring(key){
    key = key.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regex = new RegExp("[\\?&]"+key+"=([^&#]*)");
    var qs = regex.exec(window.location.href);
    if(qs == null){
        return false;
    }else{
        return qs[1];
    }
}

// simple CAPTCHA. insecure but helps 
function CAPTCHA(target, amt){
    this.img = '/images/captcha.png';
    this.dim = 28;
    this.alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.target = target;
    this.amt = amt;
    this.gen();
}
CAPTCHA.prototype.rand = function(){
    return (Math.floor(Math.random() * (25 - 0 + 1)) + 0);
}
CAPTCHA.prototype.gen = function(){
    var html = '';
    this.sol = '';
    for(var i=this.amt;i--;){
        var x = this.rand();
        this.sol += this.alpha[x];
        x *= this.dim;
        html += '<div class="captcha" style="background:url('+this.img+') no-repeat -'+x+'px 0"></div>';
    }
    html += '<div class="captcha-refresh"><i class="icon-refresh" /></div>';
    $(this.target).html(html);
    this.bind();
}
CAPTCHA.prototype.check = function(val){
    return this.sol == val.toUpperCase() ? true : false;
}
CAPTCHA.prototype.bind = function(){
    var me = this;
    $(me.target+' .captcha-refresh').unbind('click').click(function(){
        me.gen();
    });
}

function TokenManager(){
    this.tmpl = new EJS({
        element : 'TokenListItem'
    });
    this.dom = $('#token-management-container');
    this.get();
    this.alert = new ConfirmAlert();
}
TokenManager.prototype.get = function(){
    var me = this;
    $.ajax({
        type     : 'GET',
        url      : '/rest/tokens',
        dataType : 'json'
    }).done(function(res){
        me.render(res);
    }).fail(function(xhr){
        me.render();
    });
}
TokenManager.prototype.render = function(data){
    this.dom.html(this.tmpl.render({
        tokens : data
    }));
    this.bind();
}
TokenManager.prototype.bind = function(){
    var me = this;
    me.dom.find('button').click(function(){
        var outer = $(this).closest('.well');
        var magnetId = outer.attr('did');
        var actionId = $(this).attr('did');
//        var actionTitle = actionId.charAt(0).toUpperCase()+actionId.slice(1);
        var context = outer.find('strong').text();
        me.alert.display({
            title   : 'Are You Sure?',
            content : 'Please confirm whether you wish to '+actionId+' your keys for "'+context+'"'
        }, function(){
            me.doAction(actionId, magnetId);
        });
    });
}
TokenManager.prototype.doAction = function(actionId, magnetId){
    var me = this;
    $.ajax({
        type : 'POST',
        url  : '/rest/tokens/'+magnetId+'/'+actionId
    }).done(function(){
        me.get();
        alert('Your keys have been '+actionId+'d.');
    }).fail(function(xhr){
        alert('Unable to '+actionId+' your keys. Please try again later.');
    });
}

// parse a string into JSON or return false
function tryParseJSON(str){
    try{
        return JSON.parse(str);
    }catch(e){
        return false;
    }
}

function DocSearch(){
    var me = this;
    me.matcher = '#/query/';
    me.container = $('#docs-search-results');
    me.input = $('#docs-search-input');
    me.isActive = false;
    me.startIndex = 1;
    me.input.live('keypress', function(e){
        if(e.keyCode == 13){
            me.startIndex = 1;
            if(window.location.href.indexOf('docs/search') == -1)
                window.location.href = '/docs/search/#/query/'+me.input.val()+'/1';
            else
                me.exec();
            return false;
        }
    });
    $('#docs-search-btn').click(function(){
        me.startIndex = 1;
        if(window.location.href.indexOf('docs/search') == -1)
            window.location.href = '/docs/search/#/query/'+me.input.val()+'/1';
        else
            me.exec();

    });
    var str = window.location.href;
    if(str.indexOf(me.matcher) != -1){
        var hashTag = str.slice(str.indexOf(me.matcher)).replace(me.matcher, '');
        var ary = hashTag.split('/');
        me.startIndex = ary[1] ? parseInt(ary[1]) : me.startIndex;
        me.exec(ary[0]);
    }
}
DocSearch.prototype.exec = function(query){
    var me = this;
    var invalidInput = 'Input must have a minimum of three characters. Please refine your search.';
    var val = query || $.trim(me.input.val()).replace(/[^a-zA-Z0-9 _-]/g, '');
    if(val.length > 2 && me.isActive === false){
        me.isActive = true;
        $.ajax({
            type     : 'GET',
            url      : '/rest/search?query='+val+'&from='+me.startIndex,
            dataType : 'json'
        }).done(function(res){
            me.renderDocs(val, res);
            me.input.val('');
        }).fail(function(xhr){
            var e = String(xhr.responseText);
            switch(e){
                case 'missing-query' : e = invalidInput; break;
                case 'server-error' : e = 'A server error has occurred. Please try again later.'; break;
            }
            me.renderDocs(val, {}, e);
        }).always(function(){
            me.isActive = false;
            me.formatQuery(val);
        });
    }else{
        me.formatQuery(val);
        me.renderDocs(val, {}, invalidInput);
    }
}
DocSearch.prototype.formatQuery = function(val){
    var str = window.location.href;
    if(str.indexOf(this.matcher) != -1)
        str = str.substr(str.indexOf(this.matcher));
    window.location.href = window.location.href.replace(str, '') + this.matcher + val + '/' + this.startIndex;
}
DocSearch.prototype.renderDocs = function(val, results, error){
    var me = this, html = '', meta = '<p id="search-meta">';
    if(error){
        html += error;
    }else if(!results.hits || !results.hits.hits || results.hits.hits.length == 0){
        meta += 'No results found. Please refine your search.';
        html += (meta + '</p>');
    }else{
        var ary = results.hits.hits;
        var total = results.hits.total;
        meta += total+' result'+(total == 1 ? '' : 's') + ' found. ';
        if(total > 10) meta += 'Showing results ' + me.startIndex + ' to ' + ((me.startIndex+10) < total ? (me.startIndex+9) : total) + '.';
        html += (meta + '</p>');
        for(var i=0;i<ary.length;++i){
            html += '<div>\
                <a href="'+ary[i]._id+'">'+ary[i].fields.name+'</a><br />\
                <span>'+ary[i]._id+'</span><br />\
                <p>'+(ary[i].highlight.name || ('...'+ary[i].highlight.text+'...'))+'</p>\
            </div>';
        }
        if(total > 10){
            html += '<div class="pagination">';
            if(this.startIndex >= 10)
                html += '<button class="prev-page btn" from="'+(me.startIndex - 10)+'">Previous Page</button>';
            if((this.startIndex + 10) < total)
                html += '<button class="next-page btn" from="'+(me.startIndex + 10)+'">Next Page</button>';
            html += '</div>';
        }
    }
    me.container.html(html);
    me.container.find('.pagination button').click(function(){
        me.startIndex = parseInt($(this).attr('from'));
        me.exec(val);
    });
}

function SessionManager(cookies){
    this.sessionLength = 20;
    this.timestamp = this.getTimestamp();
    this.timers = [
        {time : 2},
        {time : 1},
        {time : 0}
    ];
    this.alert = new ConfirmAlert();
    this.cookies = cookies;
    this.cookies.create('session_timestamp', this.timestamp, 1);
    this.reset();
}
SessionManager.prototype.reset = function(){
    for(var i=this.timers.length;i--;){
        clearTimeout(this.timers[i].timer);
        this.set(this.timers[i]);
    }
}
SessionManager.prototype.set = function(timer){
    var me = this;
    timer.timer = setTimeout(function(){
        me.confirm(timer.time);
    }, (me.sessionLength-timer.time) * 60 * 1000);
}
SessionManager.prototype.confirm = function(time){
    var me = this;
    var timestamp = me.cookies.get('session_timestamp');
    if(timestamp && timestamp != me.timestamp){
        me.timestamp = timestamp;
        $('.modal').modal('hide');
        me.reset();
        return false;
    }
    if(time == 0){
        $('.modal').modal('hide');
        me.cookies.remove('session_timestamp');
        me.cookies.remove('magnet_auth');
        window.location.replace('/logout');
    }else{
        me.alert.display({
            title   : 'Session Timeout Soon',
            content : 'Your session is timing out in '+time+' minutes. Would you like to refresh your session?'
        }, function(){
            getBeacon();
            me.timestamp = me.getTimestamp();
            me.cookies.create('session_timestamp', me.timestamp, 1);
        });
    }
}
SessionManager.prototype.getTimestamp = function(){
    return Math.round(+new Date()/1000);
}

// alerts
function Alert(vars){
    if(vars){   
        $(vars.el).modal('show');
        $(vars.el).find('.modal-header h3').html(vars.title);
        $(vars.el).find(' .modal-body p').html(vars.content);
    }
}
function ConfirmAlert(){
    this.el = '#confirm-alert';
    this.bind();
}
ConfirmAlert.prototype.init = function(){
    $(this.el).modal({
        show     : false,
        keyboard : true,
        backdrop : true
    });
}
ConfirmAlert.prototype.display = function(vars, callback){
    if(vars && typeof callback === typeof Function){
        $(this.el).modal('show');
        $(this.el).find('.modal-header h3').text(vars.title);
        $(this.el).find(' .modal-body p').text(vars.content);
        this.callback = callback;
    }
}
ConfirmAlert.prototype.bind = function(){
    var me = this;
    $(me.el+' button.submit').click(function(){
        $(me.el).modal('hide');
        me.callback();
    });
}

function DocFormatter(){
    var me = this;
    me.showFull = false;
    me.className = '.TitleTOC, .TitleChapterTOC, .Heading1TOC, .Heading2TOC, .Heading3TOC, .Title-Release-Note';
    me.el = $(this.className);
    me.destination = $('#doc-toc');
    if(me.destination.length){
        if(window.location.href.indexOf('release_notes') == -1)
            me.el.closest('div').appendTo(me.destination);
        $('.Copyright').remove();
        $('.Address').closest('div').remove();
        $('.BookTitle').find('br').remove();
        me.el.find('.Index').each(function(){
            me.initUI($(this));
        });
        me.bindClick();
        me.bindToggle();
        $('#doc-content, #doc-toc').show();
    }
}
DocFormatter.prototype.initUI = function(dom){
    var id = dom.attr('href').replace('index.html#', '');
    var text = dom.text().split('');
    for(var i=text.length;i--;){
        if(text[i].match(/[a-zA-Z]/g)){
            break;
        }else{
            text.pop();
        }
    }
    text = text.join('');
    dom.text(text);
    $('a[name="'+id+'"]').closest('div').addClass('doc-section').attr('did', id);
}
DocFormatter.prototype.bindToggle = function(){
    var me = this;
    var switcher = $('#doc-switch');
    var pdfPath = window.location.pathname ? window.location.pathname.replace('/docs/', '').replace(/\//g, '')+'.pdf' : 'pdf.pdf';
    switcher.html('<a href="/docs/" class="btn">Return To Documentation</a><a did="print" class="btn" target="_blank" href="'+pdfPath+'">Download PDF</a>');
    //switcher.html('<a href="/docs/" class="btn">Return To Documentation</a><a did="print" class="btn" href="'+pdfPath+'">Download PDF</a><button did="on" class="btn" style="display:none">View By Chapter</button><button did="off" class="btn">View Entire Guide</button>');
    var btnOn = switcher.find('button[did="on"]');
    var btnOff = switcher.find('button[did="off"]');
    switcher.find('button').click(function(){
        if($(this).attr('did') == 'on'){
            btnOn.hide();
            btnOff.show();
            me.showFull = false;
            $('.doc-section').hide();
            $('.Index').css('font-weight', 'normal');
        }else if($(this).attr('did') == 'off'){
            btnOn.show();
            btnOff.hide();
            me.showFull = true;
            $('.doc-section').show();
            $('.Index').css('font-weight', 'normal');
        }else if($(this).attr('did') == 'print'){
            var title = $.trim($('.BookTitle').text()).replace(/[^A-Z0-9]+/ig, '_')+'.pdf';
            window.open(title, '_blank');
        }
    });
}
DocFormatter.prototype.bindClick = function(){
    var me = this;
    var tocList = $('.Index');
    tocList.click(function(){
        if(me.showFull){
            return true;
        }
        tocList.css('font-weight', 'normal');
        me.updateUI($(this));
    });
    var linkList = $('.XRef');
    linkList.click(function(){
        if(me.showFull){
            return true;
        }
        //$('.doc-section').hide();
        tocList.css('font-weight', 'normal');
        var id = $(this).attr('href').replace('index.html#', '');
        //$('a[name="'+id+'"]').closest('.doc-section').show();
    });
}
DocFormatter.prototype.updateUI = function(dom){
    //$('.doc-section').hide();
    var parent = dom.parent();
    if(parent.attr('class') == 'TitleChapterTOC' || 1 == 1){
        parent.closest('div').find('.Index').each(function(){
            $(this).css('font-weight', 'bold');
            var id = $(this).attr('href').replace('index.html#', '');
            //$('.doc-section[did="'+id+'"]').show();
        });
    }else{
        dom.css('font-weight', 'bold');
        var id = dom.attr('href').replace('index.html#', '');
        //$('.doc-section[did="'+id+'"], a[name="'+id+'"]').show();
    }
}

function ResourceNavigation(){
    $('.selector-options a').click(function(e){
        e.preventDefault();
        var parent = $(this).closest('.selector-options').attr('did');
        var selection = $(this).attr('did');
        $('.'+parent+' > a').removeClass('active');
        $('.'+parent+' > div').hide();
        $('.'+parent+' > div[class~="'+selection+'"]').show();
        $(this).addClass('active');
    });
}

function GetStartedNavigation(){
    var hash = window.location.hash;
    var page = $('#get-started');
    if(page.length){
        if(hash && inIframe() === false){
            page.find('.nav-tabs[did="gs-nav-main"] li').removeClass('active');
            page.find('.tab-content[did="gs-nav-main"] > .tab-pane').removeClass('active');
            page.find(hash).addClass('active');
            page.find('.nav-tabs a[href="'+hash+'"]').closest('li').addClass('active');
        }
        page.find('.nav-tabs > li > a').click(function(e){
            e.preventDefault();
            var link = $(e.currentTarget);
            var li = link.closest('li');
            var list = li.closest('.nav-tabs');
            var did = list.attr('did');
            list.find('li').removeClass('active');
            page.find('.tab-content[did="'+did+'"] > .tab-pane').removeClass('active');
            page.find(link.attr('href')).addClass('active');
            li.addClass('active');
        });
        var menu = $('#gs-site-menu');
        $('#gs-site-menu li a').click(function(){
            var link = $('.nav-tabs li a[href="'+$(this).attr('href').replace('/get-started/', '')+'"]');
            var li = link.closest('li');
            var list = li.closest('.nav-tabs');
            var did = list.attr('did');
            list.find('li').removeClass('active');
            page.find('.tab-content[did="'+did+'"] > .tab-pane').removeClass('active');
            page.find(link.attr('href')).addClass('active');
            li.addClass('active');
        })
    }
}

function inIframe(){
    try{
        return window.self !== window.top;
    }catch(e){
        return true;
    }
}

function initPlaceholders(){
    /* Placeholders.js v2.1.0 */
    !function(a){"use strict";function b(a,b,c){return a.addEventListener?a.addEventListener(b,c,!1):a.attachEvent?a.attachEvent("on"+b,c):void 0}function c(a,b){var c,d;for(c=0,d=a.length;d>c;c++)if(a[c]===b)return!0;return!1}function d(a,b){var c;a.createTextRange?(c=a.createTextRange(),c.move("character",b),c.select()):a.selectionStart&&(a.focus(),a.setSelectionRange(b,b))}function e(a,b){try{return a.type=b,!0}catch(c){return!1}}a.Placeholders={Utils:{addEventListener:b,inArray:c,moveCaret:d,changeType:e}}}(this),function(a){"use strict";function b(){}function c(a){var b;return a.value===a.getAttribute(G)&&"true"===a.getAttribute(H)?(a.setAttribute(H,"false"),a.value="",a.className=a.className.replace(F,""),b=a.getAttribute(I),b&&(a.type=b),!0):!1}function d(a){var b,c=a.getAttribute(G);return""===a.value&&c?(a.setAttribute(H,"true"),a.value=c,a.className+=" "+E,b=a.getAttribute(I),b?a.type="text":"password"===a.type&&R.changeType(a,"text")&&a.setAttribute(I,"password"),!0):!1}function e(a,b){var c,d,e,f,g;if(a&&a.getAttribute(G))b(a);else for(c=a?a.getElementsByTagName("input"):o,d=a?a.getElementsByTagName("textarea"):p,g=0,f=c.length+d.length;f>g;g++)e=g<c.length?c[g]:d[g-c.length],b(e)}function f(a){e(a,c)}function g(a){e(a,d)}function h(a){return function(){q&&a.value===a.getAttribute(G)&&"true"===a.getAttribute(H)?R.moveCaret(a,0):c(a)}}function i(a){return function(){d(a)}}function j(a){return function(b){return s=a.value,"true"===a.getAttribute(H)&&s===a.getAttribute(G)&&R.inArray(C,b.keyCode)?(b.preventDefault&&b.preventDefault(),!1):void 0}}function k(a){return function(){var b;"true"===a.getAttribute(H)&&a.value!==s&&(a.className=a.className.replace(F,""),a.value=a.value.replace(a.getAttribute(G),""),a.setAttribute(H,!1),b=a.getAttribute(I),b&&(a.type=b)),""===a.value&&(a.blur(),R.moveCaret(a,0))}}function l(a){return function(){a===document.activeElement&&a.value===a.getAttribute(G)&&"true"===a.getAttribute(H)&&R.moveCaret(a,0)}}function m(a){return function(){f(a)}}function n(a){a.form&&(x=a.form,x.getAttribute(J)||(R.addEventListener(x,"submit",m(x)),x.setAttribute(J,"true"))),R.addEventListener(a,"focus",h(a)),R.addEventListener(a,"blur",i(a)),q&&(R.addEventListener(a,"keydown",j(a)),R.addEventListener(a,"keyup",k(a)),R.addEventListener(a,"click",l(a))),a.setAttribute(K,"true"),a.setAttribute(G,v),d(a)}var o,p,q,r,s,t,u,v,w,x,y,z,A,B=["text","search","url","tel","email","password","number","textarea"],C=[27,33,34,35,36,37,38,39,40,8,46],D="#ccc",E="placeholdersjs",F=new RegExp("(?:^|\\s)"+E+"(?!\\S)"),G="data-placeholder-value",H="data-placeholder-active",I="data-placeholder-type",J="data-placeholder-submit",K="data-placeholder-bound",L="data-placeholder-focus",M="data-placeholder-live",N=document.createElement("input"),O=document.getElementsByTagName("head")[0],P=document.documentElement,Q=a.Placeholders,R=Q.Utils;if(Q.nativeSupport=void 0!==N.placeholder,!Q.nativeSupport){for(o=document.getElementsByTagName("input"),p=document.getElementsByTagName("textarea"),q="false"===P.getAttribute(L),r="false"!==P.getAttribute(M),t=document.createElement("style"),t.type="text/css",u=document.createTextNode("."+E+" { color:"+D+"; }"),t.styleSheet?t.styleSheet.cssText=u.nodeValue:t.appendChild(u),O.insertBefore(t,O.firstChild),A=0,z=o.length+p.length;z>A;A++)y=A<o.length?o[A]:p[A-o.length],v=y.attributes.placeholder,v&&(v=v.nodeValue,v&&R.inArray(B,y.type)&&n(y));w=setInterval(function(){for(A=0,z=o.length+p.length;z>A;A++)y=A<o.length?o[A]:p[A-o.length],v=y.attributes.placeholder,v&&(v=v.nodeValue,v&&R.inArray(B,y.type)&&(y.getAttribute(K)||n(y),(v!==y.getAttribute(G)||"password"===y.type&&!y.getAttribute(I))&&("password"===y.type&&!y.getAttribute(I)&&R.changeType(y,"text")&&y.setAttribute(I,"password"),y.value===y.getAttribute(G)&&(y.value=v),y.setAttribute(G,v))));r||clearInterval(w)},100)}Q.disable=Q.nativeSupport?b:f,Q.enable=Q.nativeSupport?b:g}(this);
}

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-42583982-2', 'magnet.com');
ga('send', 'pageview');

(function(){var rsplit=function(string,regex){var result=regex.exec(string),retArr=new Array(),first_idx,last_idx,first_bit;while(result!=null){first_idx=result.index;last_idx=regex.lastIndex;if((first_idx)!=0){first_bit=string.substring(0,first_idx);retArr.push(string.substring(0,first_idx));string=string.slice(first_idx)}retArr.push(result[0]);string=string.slice(result[0].length);result=regex.exec(string)}if(!string==""){retArr.push(string)}return retArr},chop=function(string){return string.substr(0,string.length-1)},extend=function(d,s){for(var n in s){if(s.hasOwnProperty(n)){d[n]=s[n]}}};EJS=function(options){options=typeof options=="string"?{view:options}:options;this.set_options(options);if(options.precompiled){this.template={};this.template.process=options.precompiled;EJS.update(this.name,this);return }if(options.element){if(typeof options.element=="string"){var name=options.element;options.element=document.getElementById(options.element);if(options.element==null){throw name+"does not exist!"}}if(options.element.value){this.text=options.element.value}else{this.text=options.element.innerHTML}this.name=options.element.id;this.type="["}else{if(options.url){options.url=EJS.endExt(options.url,this.extMatch);this.name=this.name?this.name:options.url;var url=options.url;var template=EJS.get(this.name,this.cache);if(template){return template}if(template==EJS.INVALID_PATH){return null}try{this.text=EJS.request(url+(this.cache?"":"?"+Math.random()))}catch(e){}if(this.text==null){throw ({type:"EJS",message:"There is no template at "+url})}}}var template=new EJS.Compiler(this.text,this.type);template.compile(options,this.name);EJS.update(this.name,this);this.template=template};EJS.prototype={render:function(object,extra_helpers){object=object||{};this._extra_helpers=extra_helpers;var v=new EJS.Helpers(object,extra_helpers||{});return this.template.process.call(object,object,v)},update:function(element,options){if(typeof element=="string"){element=document.getElementById(element)}if(options==null){_template=this;return function(object){EJS.prototype.update.call(_template,element,object)}}if(typeof options=="string"){params={};params.url=options;_template=this;params.onComplete=function(request){var object=eval(request.responseText);EJS.prototype.update.call(_template,element,object)};EJS.ajax_request(params)}else{element.innerHTML=this.render(options)}},out:function(){return this.template.out},set_options:function(options){this.type=options.type||EJS.type;this.cache=options.cache!=null?options.cache:EJS.cache;this.text=options.text||null;this.name=options.name||null;this.ext=options.ext||EJS.ext;this.extMatch=new RegExp(this.ext.replace(/\./,"."))}};EJS.endExt=function(path,match){if(!path){return null}match.lastIndex=0;return path+(match.test(path)?"":this.ext)};EJS.Scanner=function(source,left,right){extend(this,{left_delimiter:left+"%",right_delimiter:"%"+right,double_left:left+"%%",double_right:"%%"+right,left_equal:left+"%=",left_comment:left+"%#"});this.SplitRegexp=left=="["?/(\[%%)|(%%\])|(\[%=)|(\[%#)|(\[%)|(%\]\n)|(%\])|(\n)/:new RegExp("("+this.double_left+")|(%%"+this.double_right+")|("+this.left_equal+")|("+this.left_comment+")|("+this.left_delimiter+")|("+this.right_delimiter+"\n)|("+this.right_delimiter+")|(\n)");this.source=source;this.stag=null;this.lines=0};EJS.Scanner.to_text=function(input){if(input==null||input===undefined){return""}if(input instanceof Date){return input.toDateString()}if(input.toString){return input.toString()}return""};EJS.Scanner.prototype={scan:function(block){scanline=this.scanline;regex=this.SplitRegexp;if(!this.source==""){var source_split=rsplit(this.source,/\n/);for(var i=0;i<source_split.length;i++){var item=source_split[i];this.scanline(item,regex,block)}}},scanline:function(line,regex,block){this.lines++;var line_split=rsplit(line,regex);for(var i=0;i<line_split.length;i++){var token=line_split[i];if(token!=null){try{block(token,this)}catch(e){throw {type:"EJS.Scanner",line:this.lines}}}}}};EJS.Buffer=function(pre_cmd,post_cmd){this.line=new Array();this.script="";this.pre_cmd=pre_cmd;this.post_cmd=post_cmd;for(var i=0;i<this.pre_cmd.length;i++){this.push(pre_cmd[i])}};EJS.Buffer.prototype={push:function(cmd){this.line.push(cmd)},cr:function(){this.script=this.script+this.line.join("; ");this.line=new Array();this.script=this.script+"\n"},close:function(){if(this.line.length>0){for(var i=0;i<this.post_cmd.length;i++){this.push(pre_cmd[i])}this.script=this.script+this.line.join("; ");line=null}}};EJS.Compiler=function(source,left){this.pre_cmd=["var ___ViewO = [];"];this.post_cmd=new Array();this.source=" ";if(source!=null){if(typeof source=="string"){source=source.replace(/\r\n/g,"\n");source=source.replace(/\r/g,"\n");this.source=source}else{if(source.innerHTML){this.source=source.innerHTML}}if(typeof this.source!="string"){this.source=""}}left=left||"<";var right=">";switch(left){case"[":right="]";break;case"<":break;default:throw left+" is not a supported deliminator";break}this.scanner=new EJS.Scanner(this.source,left,right);this.out=""};EJS.Compiler.prototype={compile:function(options,name){options=options||{};this.out="";var put_cmd="___ViewO.push(";var insert_cmd=put_cmd;var buff=new EJS.Buffer(this.pre_cmd,this.post_cmd);var content="";var clean=function(content){content=content.replace(/\\/g,"\\\\");content=content.replace(/\n/g,"\\n");content=content.replace(/"/g,'\\"');return content};this.scanner.scan(function(token,scanner){if(scanner.stag==null){switch(token){case"\n":content=content+"\n";buff.push(put_cmd+'"'+clean(content)+'");');buff.cr();content="";break;case scanner.left_delimiter:case scanner.left_equal:case scanner.left_comment:scanner.stag=token;if(content.length>0){buff.push(put_cmd+'"'+clean(content)+'")')}content="";break;case scanner.double_left:content=content+scanner.left_delimiter;break;default:content=content+token;break}}else{switch(token){case scanner.right_delimiter:switch(scanner.stag){case scanner.left_delimiter:if(content[content.length-1]=="\n"){content=chop(content);buff.push(content);buff.cr()}else{buff.push(content)}break;case scanner.left_equal:buff.push(insert_cmd+"(EJS.Scanner.to_text("+content+")))");break}scanner.stag=null;content="";break;case scanner.double_right:content=content+scanner.right_delimiter;break;default:content=content+token;break}}});if(content.length>0){buff.push(put_cmd+'"'+clean(content)+'")')}buff.close();this.out=buff.script+";";var to_be_evaled="/*"+name+"*/this.process = function(_CONTEXT,_VIEW) { try { with(_VIEW) { with (_CONTEXT) {"+this.out+" return ___ViewO.join('');}}}catch(e){e.lineNumber=null;throw e;}};";try{eval(to_be_evaled)}catch(e){if(typeof JSLINT!="undefined"){JSLINT(this.out);for(var i=0;i<JSLINT.errors.length;i++){var error=JSLINT.errors[i];if(error.reason!="Unnecessary semicolon."){error.line++;var e=new Error();e.lineNumber=error.line;e.message=error.reason;if(options.view){e.fileName=options.view}throw e}}}else{throw e}}}};EJS.config=function(options){EJS.cache=options.cache!=null?options.cache:EJS.cache;EJS.type=options.type!=null?options.type:EJS.type;EJS.ext=options.ext!=null?options.ext:EJS.ext;var templates_directory=EJS.templates_directory||{};EJS.templates_directory=templates_directory;EJS.get=function(path,cache){if(cache==false){return null}if(templates_directory[path]){return templates_directory[path]}return null};EJS.update=function(path,template){if(path==null){return }templates_directory[path]=template};EJS.INVALID_PATH=-1};EJS.config({cache:true,type:"<",ext:".ejs"});EJS.Helpers=function(data,extras){this._data=data;this._extras=extras;extend(this,extras)};EJS.Helpers.prototype={view:function(options,data,helpers){if(!helpers){helpers=this._extras}if(!data){data=this._data}return new EJS(options).render(data,helpers)},to_text:function(input,null_text){if(input==null||input===undefined){return null_text||""}if(input instanceof Date){return input.toDateString()}if(input.toString){return input.toString().replace(/\n/g,"<br />").replace(/''/g,"'")}return""}};EJS.newRequest=function(){var factories=[function(){return new ActiveXObject("Msxml2.XMLHTTP")},function(){return new XMLHttpRequest()},function(){return new ActiveXObject("Microsoft.XMLHTTP")}];for(var i=0;i<factories.length;i++){try{var request=factories[i]();if(request!=null){return request}}catch(e){continue}}};EJS.request=function(path){var request=new EJS.newRequest();request.open("GET",path,false);try{request.send(null)}catch(e){return null}if(request.status==404||request.status==2||(request.status==0&&request.responseText=="")){return null}return request.responseText};EJS.ajax_request=function(params){params.method=(params.method?params.method:"GET");var request=new EJS.newRequest();request.onreadystatechange=function(){if(request.readyState==4){if(request.status==200){params.onComplete(request)}else{params.onComplete(request)}}};request.open(params.method,params.url);request.send(null)}})();EJS.Helpers.prototype.date_tag=function(C,O,A){if(!(O instanceof Date)){O=new Date()}var B=["January","February","March","April","May","June","July","August","September","October","November","December"];var G=[],D=[],P=[];var J=O.getFullYear();var H=O.getMonth();var N=O.getDate();for(var M=J-15;M<J+15;M++){G.push({value:M,text:M})}for(var E=0;E<12;E++){D.push({value:(E),text:B[E]})}for(var I=0;I<31;I++){P.push({value:(I+1),text:(I+1)})}var L=this.select_tag(C+"[year]",J,G,{id:C+"[year]"});var F=this.select_tag(C+"[month]",H,D,{id:C+"[month]"});var K=this.select_tag(C+"[day]",N,P,{id:C+"[day]"});return L+F+K};EJS.Helpers.prototype.form_tag=function(B,A){A=A||{};A.action=B;if(A.multipart==true){A.method="post";A.enctype="multipart/form-data"}return this.start_tag_for("form",A)};EJS.Helpers.prototype.form_tag_end=function(){return this.tag_end("form")};EJS.Helpers.prototype.hidden_field_tag=function(A,C,B){return this.input_field_tag(A,C,"hidden",B)};EJS.Helpers.prototype.input_field_tag=function(A,D,C,B){B=B||{};B.id=B.id||A;B.value=D||"";B.type=C||"text";B.name=A;return this.single_tag_for("input",B)};EJS.Helpers.prototype.is_current_page=function(A){return(window.location.href==A||window.location.pathname==A?true:false)};EJS.Helpers.prototype.link_to=function(B,A,C){if(!B){var B="null"}if(!C){var C={}}if(C.confirm){C.onclick=' var ret_confirm = confirm("'+C.confirm+'"); if(!ret_confirm){ return false;} ';C.confirm=null}C.href=A;return this.start_tag_for("a",C)+B+this.tag_end("a")};EJS.Helpers.prototype.submit_link_to=function(B,A,C){if(!B){var B="null"}if(!C){var C={}}C.onclick=C.onclick||"";if(C.confirm){C.onclick=' var ret_confirm = confirm("'+C.confirm+'"); if(!ret_confirm){ return false;} ';C.confirm=null}C.value=B;C.type="submit";C.onclick=C.onclick+(A?this.url_for(A):"")+"return false;";return this.start_tag_for("input",C)};EJS.Helpers.prototype.link_to_if=function(F,B,A,D,C,E){return this.link_to_unless((F==false),B,A,D,C,E)};EJS.Helpers.prototype.link_to_unless=function(E,B,A,C,D){C=C||{};if(E){if(D&&typeof D=="function"){return D(B,A,C,D)}else{return B}}else{return this.link_to(B,A,C)}};EJS.Helpers.prototype.link_to_unless_current=function(B,A,C,D){C=C||{};return this.link_to_unless(this.is_current_page(A),B,A,C,D)};EJS.Helpers.prototype.password_field_tag=function(A,C,B){return this.input_field_tag(A,C,"password",B)};EJS.Helpers.prototype.select_tag=function(D,G,H,F){F=F||{};F.id=F.id||D;F.value=G;F.name=D;var B="";B+=this.start_tag_for("select",F);for(var E=0;E<H.length;E++){var C=H[E];var A={value:C.value};if(C.value==G){A.selected="selected"}B+=this.start_tag_for("option",A)+C.text+this.tag_end("option")}B+=this.tag_end("select");return B};EJS.Helpers.prototype.single_tag_for=function(A,B){return this.tag(A,B,"/>")};EJS.Helpers.prototype.start_tag_for=function(A,B){return this.tag(A,B)};EJS.Helpers.prototype.submit_tag=function(A,B){B=B||{};B.type=B.type||"submit";B.value=A||"Submit";return this.single_tag_for("input",B)};EJS.Helpers.prototype.tag=function(C,E,D){if(!D){var D=">"}var B=" ";for(var A in E){if(E[A]!=null){var F=E[A].toString()}else{var F=""}if(A=="Class"){A="class"}if(F.indexOf("'")!=-1){B+=A+'="'+F+'" '}else{B+=A+"='"+F+"' "}}return"<"+C+B+D};EJS.Helpers.prototype.tag_end=function(A){return"</"+A+">"};EJS.Helpers.prototype.text_area_tag=function(A,C,B){B=B||{};B.id=B.id||A;B.name=B.name||A;C=C||"";if(B.size){B.cols=B.size.split("x")[0];B.rows=B.size.split("x")[1];delete B.size}B.cols=B.cols||50;B.rows=B.rows||4;return this.start_tag_for("textarea",B)+C+this.tag_end("textarea")};EJS.Helpers.prototype.text_tag=EJS.Helpers.prototype.text_area_tag;EJS.Helpers.prototype.text_field_tag=function(A,C,B){return this.input_field_tag(A,C,"text",B)};EJS.Helpers.prototype.url_for=function(A){return'window.location="'+A+'";'};EJS.Helpers.prototype.img_tag=function(B,C,A){A=A||{};A.src=B;A.alt=C;return this.single_tag_for("img",A)}