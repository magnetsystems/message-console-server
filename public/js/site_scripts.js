var IS_LOGGED_IN;

$(document).ready(function(){
    Alerts.init();
    initPlaceholders();
    bindFeedbackButton();
    bindNewsletterSignup();
    bindWatchVideo();
    bindNews();
    bindCollapsible();
    initAuthBootstrap();
    var contact = new ContactForm();
    var docSearch = new DocHelper();
    //var tokens = window.location.href.indexOf('/profile/') != -1 ? new TokenManager() : undefined;
});

function bindCollapsible(){
    var btn = $('#show-collapsible-menu-btn');
    var els = btn.closest('.collapsible-menu-list').find('> .padding-sm, > ul');
    $('#hide-collapsible-menu-btn').click(function(){
        els.hide();
        $('.collapsible-menu-list').animate({
            width  : '42px'
        }, 500, function(){
            btn.show();
        });
    });
    btn.click(function(){
        $('.collapsible-menu-list').animate({
            width  : '280px'
        }, 500, function(){
            els.show();
            btn.hide();
        });
    });
}

function initAuthBootstrap(){
    var me = this;
    me.container = $('#login-modal');
    if(me.container.length){
        var qs = {
            token  : utils.getQuerystring('t'),
            type   : utils.getQuerystring('s'),
            id     : utils.getQuerystring('id'),
            view   : utils.getQuerystring('a'),
            status : utils.getQuerystring('status')
        };
        var login = new Login();
        var registration = new Registration();
        var startpwd = new StartResetPassword();
        var resetpwd = new ResetPassword(qs);
        var register = new CompleteRegistration(qs);
        var confirmInvitation = new ConfirmInvitation(qs);
        if(qs.status){
            switch(qs.status){
                case 'success':
                    Alerts.General.display({
                        title   : 'Registration Successful',
                        content : 'Your registration has been completed successfully. Please sign in to start using the Developer Factory.'
                    });
                    break;
                case 'failed':
                    Alerts.Error.display({
                        title   : 'Registration Failed',
                        content : 'A problem occurred during registration. Have you already registered? If so, try logging in. If you cannot log in,' +
                            ' your account may have been removed. Please contact Magnet support for assistance or create a new account.'
                    });
                    break;
                case 'duplicate':
                    Alerts.General.display({
                        title   : 'Account Already Active',
                        content : 'This account is already active. You should be able to sign in now.'
                    });
                    break;
                case 'login':
                    me.container.modal('show');
                    break;
            }
        }
    }else{
        IS_LOGGED_IN = true;
        $.ajax({
            type  : 'GET',
            url   : '/beacon.json',
            cache : false
        });
        var user = Cookie.get('magnet_auth');
        if(user){
            var profile = user.split('|');
            $('#username-placeholder').text(profile[0]);
            $('.user-username').html(profile[1]);
            $('.user-company').html(profile[2] == 'undefined' ? '' : profile[2]);
            $('#name-field').val(profile[1]);
            $('#email-field').val(profile[0]);
            $('.control-buttons').removeClass('hidden');
        }
        var logout = new Logout();
        var edit = new EditUserProfile();
        $(document).ajaxComplete(function(e, xhr){
            if(xhr.status == 278){
                window.location.href = '/?status=login';
            }else if(xhr.status == 279){
                window.location.href = '/?status=locked';
            }
        });;
        $('#user-panel-toggle').click(function(e){
            e.preventDefault();
            var dom = $('#user-panel');
            dom['slide'+(dom.css('display') == 'block' ? 'Up': 'Down')]('fast');
        });
        $('.protectedresourceinfo').remove();
    }
}

function bindFeedbackButton(){
    $('#leave-feedback-container').show();
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
        $.data(this, 'baseHeight', $(this).height()+14);
        $.data(this, 'baseWidth', $(this).width());
        $('#leave-feedback-container').css('opacity', '1');
    }).css(closed);
    btn.click(function(e){
        e.preventDefault();
        if(btn.hasClass('active')){
            btn.removeClass('active');
            complete.hide('slow');
            error.hide('slow');
            div.animate(closed, 600);
        }else{
            setTimeout(function(){
                btn.addClass('active');
                complete.hide('slow');
                error.hide('slow');
                div.animate({
                    height  : div.data('baseHeight') + 20,
                    width   : div.data('baseWidth'),
                    padding : '10px',
                    opacity : 1
                }, 600);
            }, 100);
        }
    });
    $('html').click(function(e){
        if(btn.hasClass('active')){
            btn.removeClass('active');
            complete.hide('slow');
            error.hide('slow');
            div.animate(closed, 600);
        }
    });
    $('#leave-feedback-container').click(function(e){
        e.stopPropagation();
    });
    submitBtn.click(function(e){
        e.stopPropagation();
        e.preventDefault();
        var type = $('#feedback-type-field');
        var name = $('#feedback-name');
        var sub = $('#feedback-subject');
        var msg = $('#feedback-message');
        var email = $('#feedback-email');
        if(isActive === false && $.trim(msg.val()).length > 0){
            isActive = true;
            submitBtn.hide();
            loader.show();
            $.ajax({
                type        : 'POST',
                url         : '/rest/submitFeedback',
                data        : {
                    fullname     : name.val(),
                    type         : type.val(),
                    msg          : msg.val(),
                    sub          : sub.val(),
                    emailaddress : email.val()
                },
                contentType : 'application/x-www-form-urlencoded'
            }).done(function(){
                complete.show('slow');
            }).fail(function(){
                error.show('slow');
            }).always(function(){
                name.val('');
                msg.val('');
                sub.val('');
                email.val('');
                div.css(closed);
                isActive = false;
                submitBtn.show();
                loader.hide();
            });
        }
    });
}

function bindNewsletterSignup(){
    $('.newsletter-signup-btn').click(function(){
        var form = $(this).closest('.form-group');
        var parent = form.length ? form : $(this).closest('.modal-content');
        var input = parent.find('input[name="email"]');
        if(!utils.emailRegex.test(input.val())){
            if(!form.length) parent.closest('.modal').modal('hide');
            return Alerts.Error.display({
                title   : 'Invalid Email Address',
                content : 'The format of the email address you provided is invalid.'
            });
        }
        $.ajax({
            type        : 'POST',
            url         : '/rest/subscribeNewsletter',
            data        : {
                email  : $.trim(input.val()),
                source : window.location.pathname
            },
            contentType : 'application/x-www-form-urlencoded'
        }).done(function(){
            var title = 'All Set!';
            var content = 'You have been registered to receive our newsletter.';
            if(form.length){
                parent.html('<div class="alert alert-success" role="alert"><strong>'+title+'</strong> <span>'+content+'</span></div>');
            }else{
                parent.closest('.modal').modal('hide');
                Alerts.General.display({
                    title   : title,
                    content : content
                });
            }
        }).fail(function(xhr){
            var msg = 'There was an error subscribing your email. Please try again later.';
            if(xhr.responseText == 'already-registered') msg = 'This email address has already been used to subscribe.';
            if(!form.length) parent.closest('.modal').modal('hide');
            Alerts.Error.display({
                title   : 'Could Not Subscribe',
                content : msg
            });
        });
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
    var ytVideoID, ytModalTitle;
    var $window = $(window);
    var modal = $('#watch-video-modal');
    var videoContainer = modal.find('.modal-body');
    var modalHeader = modal.find('.modal-header');
    var modalFooter = modal.find('.modal-footer');
    if(modal.length){
        $('.watch-video-btn').click(function(e){
            e.preventDefault();
            ytVideoID = $(this).attr('did');
//            ytModalTitle = $(this).attr('video-title');
            if(ytVideoID && ytVideoID.length > 1){
//                modal.find('.modal-title').html(ytModalTitle);
                modal.modal('show');
                window.onYouTubeIframeAPIReady = function(){
                    ytVideoPlayer = new YT.Player('watch-video-container', {
                        height     : 487,
                        width      : 869,
                        playerVars : {
                            controls : 0,
                            showinfo : 0,
                            rel      : 0
                        },
                        videoId    : ytVideoID,
                        events     : {
                            'onReady' : function(event){
                                event.target.playVideo();
                            }
                        }
                    });
                };
                setTimeout(function(){
                    var videoContainer = modal.find('#watch-video-container');
//                    videoContainer.css('width', '100%');
//                    videoContainer.css('height', modal.height()-modalHeader.height()-modalFooter.height()-120);
                    var tag = document.createElement('script');
                    tag.src = "https://www.youtube.com/iframe_api";
                    var firstScriptTag = document.getElementsByTagName('script')[0];
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                }, 500);
            }
        });
        $window.resize(function(){
//            setTimeout(function(){
//                if(ytVideoID){
//                    var videoContainer2 = modal.find('#watch-video-container');
//                    var dim = calculateAspectRatioFit(videoContainer2.width(), videoContainer2.height(), 1738, 974);
//                    videoContainer2.css('width', dim.width);
//                    videoContainer2.css('height', dim.height);
//                }
//            }, 800);
        });
        modal.on('hide.bs.modal', function(){
            ytVideoPlayer.stopVideo();
        });
    }
}

function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight){
    var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return {
        width  : srcWidth * ratio,
        height : srcHeight * ratio
    };
}

function Logout(){
    var me = this;
    $('.btn-logout').click(function(e){
        e.preventDefault();
        me.call();
    });
}
Logout.prototype.call = function(){
    $('.modal_errors').hide();
    $.ajax({
        type        : 'POST',
        url         : '/rest/logout',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded'
    }).done(function(result, status, xhr){
        Cookie.remove('magnet_auth');
        window.location.href = '/';
    });
};

function Login(){
    var me = this;
    me.container = $('#login-modal');
    if(me.container.length){
        $('.show-login-popup').click(function(){
            utils.resetError(me.container);
            me.container.find('input').val('');
            me.container.find('.modal-header strong').addClass('hidden');
            me.container.modal('show');
            setTimeout(function(){
                me.container.find('input[name="name"]').focus();
            }, 500);
        });
        $('#sign-in-btn').click(function(){
            me.login();
        });
        me.container.find('input').keypress(function(e){
            if(e.keyCode == 13) me.login();
        });
        var res = $('.protectedresource');
        res.after('<div class="protectedresourceinfo"> <span class="glyphicon glyphicon-lock"></span>Requires Sign In</div>');
        res.click(function(e){
            e.preventDefault();
            me.container.find('.modal-header strong').removeClass('hidden');
            me.container.modal('show');
            setTimeout(function(){
                me.container.find('input[name="name"]').focus();
            }, 500);
        });
    }
}
Login.prototype.login = function(){
    var me = this;
    utils.resetError(me.container);
    var obj = utils.collect(me.container);
    var user = me.container.find('input[name="name"]');
    var pass = me.container.find('input[name="password"]');
    if(!$.trim(obj.name).length){
        return utils.showError(me.container, 'Required Field Missing', 'Please enter a valid email address', user);
    }else if(!$.trim(obj.password).length){
        return utils.showError(me.container, 'Required Field Missing', 'Please enter a valid password', pass);
    }
    utils.startLoading(me.domId);
    $.ajax({
        type        : 'POST',
        url         : '/rest/login',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : obj
    }).done(function(){
        window.location.reload(true);
    }).fail(function(xhr){
        utils.endLoading(me.domId);
        if(xhr.responseText == 'invalid-login')
            utils.showError(me.container, 'Incorrect Email Address and/or Password', 'Please check your input and try again.');
        else
            utils.showError(me.container, 'Account Locked', 'Your account has been locked.');
    });
};

function Registration(){
    var me = this;
    me.domId = 'registration';
    me.container = $('#registration');
    me.container.find('input[name="firstName"]').focus();
    $('#btn-start-registration').click(function(){
        me.request();
    });
    me.container.find('input').keypress(function(e){
        if(e.keyCode == 13){
            me.request();
        }
    });
    me.container.find('input').val('');
}
Registration.prototype.request = function(){
    var me = this, valid = true;
    utils.resetError(me.container);
    var obj = utils.collect(me.container);
    me.container.find('input[name!="captcha"]').each(function(){
        if($(this).attr('name') != 'recaptcha_response_field' && ($.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder'))){
            valid = false;
            return utils.showError(me.container, 'Required Field Missing', 'Please enter a '+$(this).attr('placeholder'), $(this));
        }
    });
    if(!utils.emailRegex.test(me.container.find('input[name="email"]').val())){
        valid = false;
        return utils.showError(me.container, 'Invalid Email Address', 'The format of the email address you provided is invalid.', $(this));
    }
    if(valid){
        delete obj.password2;
        obj.userName = obj.email;
        me.call(obj);
    }
};
Registration.prototype.call = function(obj){
    var me = this;
    utils.startLoading(me.domId);
    $.ajax({  
        type        : 'POST',  
        url         : '/rest/startRegistration',  
        dataType    : 'json',
        contentType : 'application/x-www-form-urlencoded',
        data        : obj
    }).done(function(res){
        utils.endLoading(me.domId);
        me.container.find('input').val('');
        $('#btn-start-registration').hide();
        var msg = 'Your request for an invitation has been sent successfully. ';
        msg += res.skipAdminApproval ? 'Please check your email to confirm your registration.' : 'An administrator will review your application and contact you through email.';
        Alerts.General.display({
            title   : 'Invitation Request Sent Successfully',
            content : msg
        });
    }).fail(function(xhr){
        utils.endLoading(me.domId);
        var msg = 'A server error occurred during registration. Please try again later.';
        switch(xhr.responseText){
            case 'invalid-email' : msg = 'The format of the email address you provided is invalid.'; break;
            case 'required-field-missing' : msg = 'A required field has been left blank.'; break;
            case 'captcha-failed' : msg = 'The Spam Protection validation has failed. Please try again.'; Recaptcha.reload(); break;
            case '"USER_ALREADY_EXISTS"' : msg = 'The email address you specified has already been taken.'; break;
        }
        utils.showError(me.container, 'Registration Failure', msg);
    });
};

function ConfirmInvitation(params){
    var me = this;
    me.domId = 'confirm-introduce-container';
    me.params = params;
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
    utils.startLoading(me.domId);
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
        utils.endLoading(me.domId, msg);
        $('#'+me.domId+' .modal_errors, #btn-confirm-invitation').hide();
    }).fail(function(xhr){
        utils.endLoading(me.domId);
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

function CompleteRegistration(params){
    var me = this;
    me.params = params;
    me.domId = 'complete-registration';
    me.container = $('#'+me.domId);
    if(window.location.pathname.indexOf('complete-registration') != -1){
        if(me.params.token == false){
            utils.showError(me.container, 'Invalid Registration', 'Invalid registration information. Have you already been approved? Please contact Magnet support for assistance');
            me.container.find('.well').hide();
        }else{
            if(me.params.type && me.params.type == 'u'){
                me.container.find('.optional').remove();
                me.getEmail(me.params.token, function(email){
                    $('#confirm-registration-email').html('<div class="form-group"><label class="col-sm-4 control-label">Email Address</label><div class="col-sm-8"><input class="form-control" type="text" name="email" value="'+email+'" disabled="disabled"></div></div>');
                });
            }else{
                me.getEmail(me.params.token, function(email){
                    $('#confirm-registration-email').html('<div class="form-group"><label class="col-sm-4 control-label">Email Address</label><div class="col-sm-8"><input class="form-control" type="text" name="email" value="'+email+'" disabled="disabled"></div></div>');
                });
                $('#'+me.domId+' input[name="firstName"]').focus();
            }
            $('#btn-complete-registration').click(function(){
                me.register();
            });
            me.container.find('input').keypress(function(e){
                if(e.keyCode == 13){
                    me.register();
                }
            });
        }
    }
}
CompleteRegistration.prototype.register = function(){
    var me = this, valid = true;
    utils.resetError(me.container);
    var obj = utils.collect(me.container);
    if(obj.password != obj.password2){
        return utils.showError(me.container, 'Password Doesn\'t Match', 'The re-typed password doesn\'t match the original.');
    }
    me.container.find('input[name!="email"], select').each(function(){
        if(($.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder'))){
            valid = false;
            return utils.showError(me.container, 'Required Field Missing', 'Please enter a '+$(this).attr('placeholder'), $(this));
        }
    });
    if($.trim(me.container.find('input[type="password"]').val()).length < 6){
        return utils.showError(me.container, 'Invalid Password Length', 'Password must be at least 6 characters in length.', $(this));
    }
    if(valid){
        delete obj.password2;
        $('#confirm-tos-dialog').modal('show');
        $('#agree-to-tos').unbind('click').click(function(){
            $('#confirm-tos-dialog').modal('hide');
            me.call(obj);
        });
    }
};
CompleteRegistration.prototype.call = function(obj){
    var me = this;
    $('#confirm-tos-dialog').modal('hide');
    utils.startLoading(me.domId);
    $.ajax({  
        type        : 'POST', 
        url         : '/rest/users/'+me.params.token+'/completeRegistration',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : obj
    }).done(function(){
        utils.endLoading(me.domId);
        window.location.href = '/?status=success';
    }).fail(function(xhr){
        utils.endLoading(me.domId);
        var msg = 'A problem occurred during registration. Have you already registered? If so, please click on the "Return to Login" button below and try logging in.';
        if(xhr.responseText == '"USER_DOES_NOT_EXIST"'){
            msg = 'A problem occurred during registration. Have you already registered? If so, try logging in. If you cannot log in, your account may have been removed. Please contact Magnet support for assistance or create a new account.';
        }
        if(msg.indexOf('invit_req_pending') != -1 || msg.indexOf('finish') != -1 || msg.indexOf('failed') != -1){
            utils.endLoading(me.domId);
            window.location.href = '/?status=failed';
        }else{
            utils.showError(me.container, 'Registration Failure', msg);
        }
    });
};
CompleteRegistration.prototype.getEmail = function(token, callback){
    $.ajax({
        type        : 'GET',
        url         : '/rest/users/'+token,
        dataType    : 'json'
    }).done(function(data){
        if(data.state == 'failed'){
            window.location.href = '/?status=failed';
        }else if(data.state == 'finish'){
            window.location.href = '/?status=duplicate';
        }else{
            callback(data.email);
        }
    }).fail(function(){
        location.href = '/?status=failed';
    });
};

function StartResetPassword(){
    var me = this;
    me.domId = 'forgot-password';
    me.container = $('#'+me.domId);
    $('#btn-start-reset-password').click(function(){
        me.reset();
    });
    me.container.find('input').keypress(function(e){
        if(e.keyCode == 13){
            me.reset();
        }
    });
}
StartResetPassword.prototype.reset = function(){
    var me = this;
    var obj = {};
    utils.resetError(me.container);
    me.container.find('input').each(function(){
        obj[$(this).attr('name')] = $(this).val();
    });
    if(!utils.emailRegex.test(me.container.find('input[name="email"]').val())){
        return utils.showError(me.container, 'Invalid Email Address', 'The format of the email address you provided is invalid.', me.container.find('input[name="email"]'));
    }
    me.call(obj);
}
StartResetPassword.prototype.call = function(obj){
    $('.modal_errors').hide();
    var me = this;
    utils.startLoading(me.domId);
    $.ajax({  
        type        : 'POST', 
        url         : '/rest/forgotPassword',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : obj
    }).done(function(){
        utils.endLoading(me.domId);
        me.container.find('input').val('');
        Alerts.General.display({
            title   : 'Password Reset Email Sent',
            content : 'Your request to reset password has been sent successfully. Check your email for further instructions.'
        });
    }).fail(function(xhr){
        utils.endLoading(me.domId);
        var msg = 'We cannot find this email address in our records.';
        if(xhr.status == 500){
            var res = utils.tryParseJSON(xhr.responseText);
            if(res && res.message){
                msg = res.message.replace('and authority magnet', '');
            }
        }
        utils.showError(me.container, 'Password Reset Failure', msg);
    });
}

function ResetPassword(params){
    var me = this;
    me.params = params;
    me.domId = 'reset-password';
    me.container = $('#'+me.domId);
    $('#btn-reset-password').click(function(){
        me.reset();
    });
    me.container.find('input').keypress(function(e){
        if(e.keyCode == 13){
            me.reset();
        }
    });
}
ResetPassword.prototype.reset = function(){
    var me = this, valid = true;
    utils.resetError(me.container);
    var obj = utils.collect(me.container);
    if(me.params.token == false){
        utils.showError(me.container, 'Invalid Registration', 'Invalid password reset information. Try to copy and paste the url specified in the password reset email into your web browser.');
        me.container.find('.well').hide();
    }else if(obj.password != obj.password2){
        return utils.showError(me.container, 'Password Doesn\'t Match', 'The re-typed password doesn\'t match the original.');
    }else if($.trim(me.container.find('input[type="password"]').val()).length < 6){
        return utils.showError(me.container, 'Invalid Password Length', 'Password must be at least 6 characters in length.', $(this));
    }
    me.container.find('input').each(function(){
        if($.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder')){
            valid = false;
            return utils.showError(me.container, 'Required Field Missing', 'Please enter a '+$(this).attr('placeholder'), $(this));
        }
    });
    if(valid){
        delete obj.password2;
        obj.passwordResetToken = me.params.token;
        me.call(obj);
    }
}
ResetPassword.prototype.call = function(obj){
    var me = this;
    utils.startLoading(me.domId);
    $.ajax({  
        type        : 'POST', 
        url         : '/rest/resetPassword',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : obj
    }).done(function(){
        utils.endLoading(me.domId);
        me.container.find('input').val('');
        Alerts.General.display({
            title   : 'Password Reset Successfully',
            content : 'Your password has been reset successfully. Please try to login. If you experience any issues, feel free to contact Magnet support.'
        });
    }).fail(function(xhr){
        utils.endLoading(me.domId);
        var msg = 'A server error occurred during password reset. Please try again later.';
        if(xhr.status == 500){
            var res = utils.tryParseJSON(xhr.responseText);
            if(res && res.message){
                msg = res.message;
            }
        }
        utils.showError(me.container, 'Password Reset Failure', msg);
    });
}

function EditUserProfile(){
    var me = this;
    me.container = $('#user-profile-container');
    $('#profile-save-btn').click(function(){
        me.save();
    });
}
EditUserProfile.prototype.save = function(){
    var me = this;
    var obj = utils.collect(me.container);
    delete obj.userName;
    if(me.hasPassword(obj) && obj.newpassword != obj.newpassword2){
        return Alerts.Error.display({
            title   : 'Password Doesn\'t Match',
            content : 'The re-typed password doesn\'t match the original.'
        });
    }
    me.call(obj);
};
EditUserProfile.prototype.hasPassword = function(obj){
    return ($.trim(obj.oldpassword).length != 0) && ($.trim(obj.newpassword).length != 0);
};
EditUserProfile.prototype.call = function(obj){
    var me = this;
    $.ajax({
        type        : 'PUT',
        url         : '/rest/profile',
        dataType    : 'html',
        data        : obj
    }).done(function(){
        Alerts.General.display({
            title   : 'Profile Updated Successfully',
            content : 'Your profile has been updated successfully.'
        });
        me.container.find('input[type="password"]').val('');
    }).fail(function(xhr){
        var message = 'There was a generic error. Please try again later.';
        message = xhr.responseText == 'old-pass-not-match' ? 'The old password you entered was not correct.' : message;
        Alerts.Error.display({
            title   : 'Error Updating Profile',
            content : message
        });
    });
};

function ContactForm(){
    var me = this;
    me.container = $('#contact-form');
    me.container.find('input, textarea').val('');
    me.container.find('#send-contact').click(function(){
        me.contact();
    });
    me.container.find('input').keypress(function(e){
        if(e.keyCode == 13)
            me.contact();
    });
}
ContactForm.prototype.contact = function(){
    var me = this, valid = true;
    utils.resetError(me.container);
    var obj = utils.collect(me.container);
    me.container.find('input, select, textarea').each(function(){
        if($(this).attr('id') != 'recaptcha_response_field' && $.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder')){
            valid = false;
            return utils.showError(me.container, 'Required Field Missing', 'Please enter a '+$(this).attr('placeholder'), $(this));
        }
    });
    if(!IS_LOGGED_IN && !utils.emailRegex.test(me.container.find('input[name="emailaddress"]').val())){
        return utils.showError(me.container, 'Invalid Email Address', 'The format of the email address you provided is invalid.', me.container.find('input[name="emailaddress"]'));
    }
    me.call(obj);
}
ContactForm.prototype.call = function(obj){
    var me = this;
    $.ajax({  
        type        : 'POST',  
        url         : '/rest/submitFeedback',
        dataType    : 'html',
        data        : obj
    }).done(function(){
        me.container.find('.well').html('<h4>Contact Us</h4><p class="subheading">Thank you for submitting your contact request. A Magnet representative will follow up with you shortly.</p>');
        me.container.find('input, textarea').val('');
    }).fail(function(xhr){
        var msg = 'A server error occurred sending out the contact request. Please try again later.';
        switch(xhr.responseText){
            case 'invalid-email' : msg = 'The format of the email address you provided is invalid.'; break;
            case 'required-field-missing' : msg = 'A required field has been left blank.'; break;
            case 'captcha-failed' : msg = 'The Spam Protection validation has failed. Please try again.'; Recaptcha.reload(); break;
        }
        utils.showError(me.container, 'Contact Request Failure', msg);
    });
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
var utils = {
    emailRegex : /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    tryParseJSON: function(str){
        try{
            return JSON.parse(str);
        }catch(e){
            return false;
        }
    },
    getQuerystring: function(key){
        key = key.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
        var regex = new RegExp("[\\?&]"+key+"=([^&#]*)");
        var qs = regex.exec(window.location.href);
        if(qs == null){
            return false;
        }else{
            return qs[1];
        }
    },
    startLoading: function(id){
        $('#'+id+' .modal-footer').hide();
        $('#'+id+' .loading.modal-footer').show();
    },
    endLoading: function(id, params){
        $('#'+id+' .modal-footer').show();
        $('#'+id+' .loading.modal-footer').hide();
        if(params){
            $('#'+id+' h4').html(params.title);
            $('#'+id+' .form-horizontal').hide();
            $('#'+id+' .subheading').html(params.text);
        }
    },
    showError: function(dom, t, m, input){
        dom.find('.modal_errors strong').text(t+': ');
        dom.find('.modal_errors span').text(m);
        if(input) input.closest('.form-group').addClass('has-error');
        dom.find('.modal_errors').hide().slideDown('fast');
    },
    resetError: function(dom){
        dom.find('.form-group').removeClass('has-error');
        dom.find('.modal_errors').hide()
    },
    collect: function(dom){
        var obj = {}, me = this;
        dom.find('.btn-group:not(.disabled)').each(function(){
            obj[$(this).attr('did')] = $(this).find('button.btn-primary').attr('did');
        });
        dom.find('input[type="radio"]:checked').each(function(){
            var name = $(this).attr('name');
            if(name.indexOf('authMethod') != -1){
                name = name.substr(0, name.indexOf('-'));
            }
            obj[name] = $(this).val();
        });
        dom.find('input[type="text"], select, input[type="password"], input[type="hidden"], textarea').each(function(){
            var val = $(this).val();
            if(typeof $(this).attr('name') != 'undefined'){
                if($(this).attr('name') && $(this).attr('name').indexOf('Port') != -1 && $.trim(val).length == 0){
                    val = 0;
                }
                obj[$(this).attr('name')] = val;
            }
        });
        dom.find('.pill-group > .pill > span:first-child').each(function(){
            var did = $(this).closest('.pillbox').attr('name');
            obj[did] = obj[did] || [];
            obj[did].push($(this).text());
        });
        $.each(obj, function(name, val){
            if(val === 'true'){
                obj[name] = true;
            }
            if(val === 'false'){
                obj[name] = false;
            }
        });
        return obj;
    }
};

var Alerts = {
    init : function(){
        var me = this;
        me.General.generalDom = $('#general-alert');
        me.Confirm.confirmDom = $('#confirm-alert');
        me.Confirm.confirmDom.find('button.submit').click(function(){
            me.Confirm.confirmDom.modal('hide');
            me.Confirm.cb();
        });
        me.Error.errorDom = $('#error-alert');
    },
    General : {
        display : function(obj){
            this.generalDom.find('.modal-title').html(obj.title);
            this.generalDom.find('.modal-body').html(obj.content);
            this.generalDom.modal('show');
        }
    },
    Confirm : {
        display : function(obj, cb){
            if(obj && typeof cb === typeof Function){
                this.confirmDom.find('.modal-title').html(obj.title);
                this.confirmDom.find(' .modal-body').html(obj.content);
                this.confirmDom.modal('show');
                this.cb = cb;
            }
        }
    },
    Error : {
        display : function(obj){
            this.errorDom.find('.modal-title').html(obj.title);
            this.errorDom.find(' .modal-body').html(obj.content);
            this.errorDom.modal('show');
        }
    }
};

Validator.prototype.validateConfirmInvitation = function(){
    var me = this;
    var valid = true;
    $('#confirm-introduce-container input[name!="captcha"]').each(function(){
        if($.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder')){
            me.showError('Required Field Missing', 'Please enter a '+$(this).attr('placeholder'));
            valid = false;
        }
    });
    if(!utils.emailRegex.test($('#confirm-introduce-container input[name="email"]').val())){
        me.showError('Invalid Email Address', 'The format of the email address you provided is invalid.');
        valid = false;
    }
    return valid;
}
Validator.prototype.validateUserInvitation = function(){
    var me = this;
    var valid = true;
    if(!utils.emailRegex.test($('#invite-other-modal input[name="email"]').val())){
        me.showError('Invalid Email Address', 'The format of the email address you provided is invalid.');
        valid = false;
    }
    return valid;
}
var Cookie = {
    create : function(name, val, days){
        if(days){
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = '; expires=' + date.toGMTString();
        }else{
            var expires = '';
        }
        document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(val) + expires + '; path=/';
    },
    get : function(name){
        var nameEQ = encodeURIComponent(name) + '=';
        var ca = document.cookie.split(';');
        for(var i=0;i<ca.length;i++){
            var c = ca[i];
            while(c.charAt(0) == ' '){
                c = c.substring(1, c.length)
            };
            if(c.indexOf(nameEQ) == 0){
                return decodeURIComponent(c.substring(nameEQ.length, c.length))
            }
        }
        return null;
    },
    remove : function(name){
        this.create(name, "", -1);
    }
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
};
TokenManager.prototype.render = function(data){
    this.dom.html(this.tmpl.render({
        tokens : data
    }));
    this.bind();
};
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
};
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
};

function DocHelper(){
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
    var docs = $('#documentation');
    if(docs.length){
        var active = docs.find('li.active.last');
        if(active.length){
            for(var i=0;i<4;++i){
                active = active.parent().parent();
                if(active.is('li')){
                    active.addClass('active');
                    active.find('> ul').addClass('in');
                }else{
                    break;
                }
            }
        }
    }
}
DocHelper.prototype.exec = function(query){
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
DocHelper.prototype.formatQuery = function(val){
    var str = window.location.href;
    if(str.indexOf(this.matcher) != -1)
        str = str.substr(str.indexOf(this.matcher));
    window.location.href = window.location.href.replace(str, '') + this.matcher + val + '/' + this.startIndex;
}
DocHelper.prototype.renderDocs = function(val, results, error){
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
                <p>'+(ary[i].fields.brief +'... '+(ary[i].highlight.text ? ary[i].highlight.text.join('... ') : ary[i].fields.name)+'...')+'</p>\
            </div>';
        }
        if(total > 10){
            html += '<div class="pagination">';
            if(this.startIndex >= 10)
                html += '<button class="prev-page btn btn-primary" from="'+(me.startIndex - 10)+'">Previous Page</button>';
            if((this.startIndex + 10) < total)
                html += '<button class="next-page btn btn-primary" from="'+(me.startIndex + 10)+'">Next Page</button>';
            html += '</div>';
        }
    }
    me.container.html(html);
    me.container.find('.pagination button').click(function(){
        me.startIndex = parseInt($(this).attr('from'));
        me.exec(val);
    });
}

function initPlaceholders(){
    /* Placeholders.js v2.1.0 */
    !function(a){"use strict";function b(a,b,c){return a.addEventListener?a.addEventListener(b,c,!1):a.attachEvent?a.attachEvent("on"+b,c):void 0}function c(a,b){var c,d;for(c=0,d=a.length;d>c;c++)if(a[c]===b)return!0;return!1}function d(a,b){var c;a.createTextRange?(c=a.createTextRange(),c.move("character",b),c.select()):a.selectionStart&&(a.focus(),a.setSelectionRange(b,b))}function e(a,b){try{return a.type=b,!0}catch(c){return!1}}a.Placeholders={Utils:{addEventListener:b,inArray:c,moveCaret:d,changeType:e}}}(this),function(a){"use strict";function b(){}function c(a){var b;return a.value===a.getAttribute(G)&&"true"===a.getAttribute(H)?(a.setAttribute(H,"false"),a.value="",a.className=a.className.replace(F,""),b=a.getAttribute(I),b&&(a.type=b),!0):!1}function d(a){var b,c=a.getAttribute(G);return""===a.value&&c?(a.setAttribute(H,"true"),a.value=c,a.className+=" "+E,b=a.getAttribute(I),b?a.type="text":"password"===a.type&&R.changeType(a,"text")&&a.setAttribute(I,"password"),!0):!1}function e(a,b){var c,d,e,f,g;if(a&&a.getAttribute(G))b(a);else for(c=a?a.getElementsByTagName("input"):o,d=a?a.getElementsByTagName("textarea"):p,g=0,f=c.length+d.length;f>g;g++)e=g<c.length?c[g]:d[g-c.length],b(e)}function f(a){e(a,c)}function g(a){e(a,d)}function h(a){return function(){q&&a.value===a.getAttribute(G)&&"true"===a.getAttribute(H)?R.moveCaret(a,0):c(a)}}function i(a){return function(){d(a)}}function j(a){return function(b){return s=a.value,"true"===a.getAttribute(H)&&s===a.getAttribute(G)&&R.inArray(C,b.keyCode)?(b.preventDefault&&b.preventDefault(),!1):void 0}}function k(a){return function(){var b;"true"===a.getAttribute(H)&&a.value!==s&&(a.className=a.className.replace(F,""),a.value=a.value.replace(a.getAttribute(G),""),a.setAttribute(H,!1),b=a.getAttribute(I),b&&(a.type=b)),""===a.value&&(a.blur(),R.moveCaret(a,0))}}function l(a){return function(){a===document.activeElement&&a.value===a.getAttribute(G)&&"true"===a.getAttribute(H)&&R.moveCaret(a,0)}}function m(a){return function(){f(a)}}function n(a){a.form&&(x=a.form,x.getAttribute(J)||(R.addEventListener(x,"submit",m(x)),x.setAttribute(J,"true"))),R.addEventListener(a,"focus",h(a)),R.addEventListener(a,"blur",i(a)),q&&(R.addEventListener(a,"keydown",j(a)),R.addEventListener(a,"keyup",k(a)),R.addEventListener(a,"click",l(a))),a.setAttribute(K,"true"),a.setAttribute(G,v),d(a)}var o,p,q,r,s,t,u,v,w,x,y,z,A,B=["text","search","url","tel","email","password","number","textarea"],C=[27,33,34,35,36,37,38,39,40,8,46],D="#ccc",E="placeholdersjs",F=new RegExp("(?:^|\\s)"+E+"(?!\\S)"),G="data-placeholder-value",H="data-placeholder-active",I="data-placeholder-type",J="data-placeholder-submit",K="data-placeholder-bound",L="data-placeholder-focus",M="data-placeholder-live",N=document.createElement("input"),O=document.getElementsByTagName("head")[0],P=document.documentElement,Q=a.Placeholders,R=Q.Utils;if(Q.nativeSupport=void 0!==N.placeholder,!Q.nativeSupport){for(o=document.getElementsByTagName("input"),p=document.getElementsByTagName("textarea"),q="false"===P.getAttribute(L),r="false"!==P.getAttribute(M),t=document.createElement("style"),t.type="text/css",u=document.createTextNode("."+E+" { color:"+D+"; }"),t.styleSheet?t.styleSheet.cssText=u.nodeValue:t.appendChild(u),O.insertBefore(t,O.firstChild),A=0,z=o.length+p.length;z>A;A++)y=A<o.length?o[A]:p[A-o.length],v=y.attributes.placeholder,v&&(v=v.nodeValue,v&&R.inArray(B,y.type)&&n(y));w=setInterval(function(){for(A=0,z=o.length+p.length;z>A;A++)y=A<o.length?o[A]:p[A-o.length],v=y.attributes.placeholder,v&&(v=v.nodeValue,v&&R.inArray(B,y.type)&&(y.getAttribute(K)||n(y),(v!==y.getAttribute(G)||"password"===y.type&&!y.getAttribute(I))&&("password"===y.type&&!y.getAttribute(I)&&R.changeType(y,"text")&&y.setAttribute(I,"password"),y.value===y.getAttribute(G)&&(y.value=v),y.setAttribute(G,v))));r||clearInterval(w)},100)}Q.disable=Q.nativeSupport?b:f,Q.enable=Q.nativeSupport?b:g}(this);
}

(function(){var rsplit=function(string,regex){var result=regex.exec(string),retArr=new Array(),first_idx,last_idx,first_bit;while(result!=null){first_idx=result.index;last_idx=regex.lastIndex;if((first_idx)!=0){first_bit=string.substring(0,first_idx);retArr.push(string.substring(0,first_idx));string=string.slice(first_idx)}retArr.push(result[0]);string=string.slice(result[0].length);result=regex.exec(string)}if(!string==""){retArr.push(string)}return retArr},chop=function(string){return string.substr(0,string.length-1)},extend=function(d,s){for(var n in s){if(s.hasOwnProperty(n)){d[n]=s[n]}}};EJS=function(options){options=typeof options=="string"?{view:options}:options;this.set_options(options);if(options.precompiled){this.template={};this.template.process=options.precompiled;EJS.update(this.name,this);return }if(options.element){if(typeof options.element=="string"){var name=options.element;options.element=document.getElementById(options.element);if(options.element==null){throw name+"does not exist!"}}if(options.element.value){this.text=options.element.value}else{this.text=options.element.innerHTML}this.name=options.element.id;this.type="["}else{if(options.url){options.url=EJS.endExt(options.url,this.extMatch);this.name=this.name?this.name:options.url;var url=options.url;var template=EJS.get(this.name,this.cache);if(template){return template}if(template==EJS.INVALID_PATH){return null}try{this.text=EJS.request(url+(this.cache?"":"?"+Math.random()))}catch(e){}if(this.text==null){throw ({type:"EJS",message:"There is no template at "+url})}}}var template=new EJS.Compiler(this.text,this.type);template.compile(options,this.name);EJS.update(this.name,this);this.template=template};EJS.prototype={render:function(object,extra_helpers){object=object||{};this._extra_helpers=extra_helpers;var v=new EJS.Helpers(object,extra_helpers||{});return this.template.process.call(object,object,v)},update:function(element,options){if(typeof element=="string"){element=document.getElementById(element)}if(options==null){_template=this;return function(object){EJS.prototype.update.call(_template,element,object)}}if(typeof options=="string"){params={};params.url=options;_template=this;params.onComplete=function(request){var object=eval(request.responseText);EJS.prototype.update.call(_template,element,object)};EJS.ajax_request(params)}else{element.innerHTML=this.render(options)}},out:function(){return this.template.out},set_options:function(options){this.type=options.type||EJS.type;this.cache=options.cache!=null?options.cache:EJS.cache;this.text=options.text||null;this.name=options.name||null;this.ext=options.ext||EJS.ext;this.extMatch=new RegExp(this.ext.replace(/\./,"."))}};EJS.endExt=function(path,match){if(!path){return null}match.lastIndex=0;return path+(match.test(path)?"":this.ext)};EJS.Scanner=function(source,left,right){extend(this,{left_delimiter:left+"%",right_delimiter:"%"+right,double_left:left+"%%",double_right:"%%"+right,left_equal:left+"%=",left_comment:left+"%#"});this.SplitRegexp=left=="["?/(\[%%)|(%%\])|(\[%=)|(\[%#)|(\[%)|(%\]\n)|(%\])|(\n)/:new RegExp("("+this.double_left+")|(%%"+this.double_right+")|("+this.left_equal+")|("+this.left_comment+")|("+this.left_delimiter+")|("+this.right_delimiter+"\n)|("+this.right_delimiter+")|(\n)");this.source=source;this.stag=null;this.lines=0};EJS.Scanner.to_text=function(input){if(input==null||input===undefined){return""}if(input instanceof Date){return input.toDateString()}if(input.toString){return input.toString()}return""};EJS.Scanner.prototype={scan:function(block){scanline=this.scanline;regex=this.SplitRegexp;if(!this.source==""){var source_split=rsplit(this.source,/\n/);for(var i=0;i<source_split.length;i++){var item=source_split[i];this.scanline(item,regex,block)}}},scanline:function(line,regex,block){this.lines++;var line_split=rsplit(line,regex);for(var i=0;i<line_split.length;i++){var token=line_split[i];if(token!=null){try{block(token,this)}catch(e){throw {type:"EJS.Scanner",line:this.lines}}}}}};EJS.Buffer=function(pre_cmd,post_cmd){this.line=new Array();this.script="";this.pre_cmd=pre_cmd;this.post_cmd=post_cmd;for(var i=0;i<this.pre_cmd.length;i++){this.push(pre_cmd[i])}};EJS.Buffer.prototype={push:function(cmd){this.line.push(cmd)},cr:function(){this.script=this.script+this.line.join("; ");this.line=new Array();this.script=this.script+"\n"},close:function(){if(this.line.length>0){for(var i=0;i<this.post_cmd.length;i++){this.push(pre_cmd[i])}this.script=this.script+this.line.join("; ");line=null}}};EJS.Compiler=function(source,left){this.pre_cmd=["var ___ViewO = [];"];this.post_cmd=new Array();this.source=" ";if(source!=null){if(typeof source=="string"){source=source.replace(/\r\n/g,"\n");source=source.replace(/\r/g,"\n");this.source=source}else{if(source.innerHTML){this.source=source.innerHTML}}if(typeof this.source!="string"){this.source=""}}left=left||"<";var right=">";switch(left){case"[":right="]";break;case"<":break;default:throw left+" is not a supported deliminator";break}this.scanner=new EJS.Scanner(this.source,left,right);this.out=""};EJS.Compiler.prototype={compile:function(options,name){options=options||{};this.out="";var put_cmd="___ViewO.push(";var insert_cmd=put_cmd;var buff=new EJS.Buffer(this.pre_cmd,this.post_cmd);var content="";var clean=function(content){content=content.replace(/\\/g,"\\\\");content=content.replace(/\n/g,"\\n");content=content.replace(/"/g,'\\"');return content};this.scanner.scan(function(token,scanner){if(scanner.stag==null){switch(token){case"\n":content=content+"\n";buff.push(put_cmd+'"'+clean(content)+'");');buff.cr();content="";break;case scanner.left_delimiter:case scanner.left_equal:case scanner.left_comment:scanner.stag=token;if(content.length>0){buff.push(put_cmd+'"'+clean(content)+'")')}content="";break;case scanner.double_left:content=content+scanner.left_delimiter;break;default:content=content+token;break}}else{switch(token){case scanner.right_delimiter:switch(scanner.stag){case scanner.left_delimiter:if(content[content.length-1]=="\n"){content=chop(content);buff.push(content);buff.cr()}else{buff.push(content)}break;case scanner.left_equal:buff.push(insert_cmd+"(EJS.Scanner.to_text("+content+")))");break}scanner.stag=null;content="";break;case scanner.double_right:content=content+scanner.right_delimiter;break;default:content=content+token;break}}});if(content.length>0){buff.push(put_cmd+'"'+clean(content)+'")')}buff.close();this.out=buff.script+";";var to_be_evaled="/*"+name+"*/this.process = function(_CONTEXT,_VIEW) { try { with(_VIEW) { with (_CONTEXT) {"+this.out+" return ___ViewO.join('');}}}catch(e){e.lineNumber=null;throw e;}};";try{eval(to_be_evaled)}catch(e){if(typeof JSLINT!="undefined"){JSLINT(this.out);for(var i=0;i<JSLINT.errors.length;i++){var error=JSLINT.errors[i];if(error.reason!="Unnecessary semicolon."){error.line++;var e=new Error();e.lineNumber=error.line;e.message=error.reason;if(options.view){e.fileName=options.view}throw e}}}else{throw e}}}};EJS.config=function(options){EJS.cache=options.cache!=null?options.cache:EJS.cache;EJS.type=options.type!=null?options.type:EJS.type;EJS.ext=options.ext!=null?options.ext:EJS.ext;var templates_directory=EJS.templates_directory||{};EJS.templates_directory=templates_directory;EJS.get=function(path,cache){if(cache==false){return null}if(templates_directory[path]){return templates_directory[path]}return null};EJS.update=function(path,template){if(path==null){return }templates_directory[path]=template};EJS.INVALID_PATH=-1};EJS.config({cache:true,type:"<",ext:".ejs"});EJS.Helpers=function(data,extras){this._data=data;this._extras=extras;extend(this,extras)};EJS.Helpers.prototype={view:function(options,data,helpers){if(!helpers){helpers=this._extras}if(!data){data=this._data}return new EJS(options).render(data,helpers)},to_text:function(input,null_text){if(input==null||input===undefined){return null_text||""}if(input instanceof Date){return input.toDateString()}if(input.toString){return input.toString().replace(/\n/g,"<br />").replace(/''/g,"'")}return""}};EJS.newRequest=function(){var factories=[function(){return new ActiveXObject("Msxml2.XMLHTTP")},function(){return new XMLHttpRequest()},function(){return new ActiveXObject("Microsoft.XMLHTTP")}];for(var i=0;i<factories.length;i++){try{var request=factories[i]();if(request!=null){return request}}catch(e){continue}}};EJS.request=function(path){var request=new EJS.newRequest();request.open("GET",path,false);try{request.send(null)}catch(e){return null}if(request.status==404||request.status==2||(request.status==0&&request.responseText=="")){return null}return request.responseText};EJS.ajax_request=function(params){params.method=(params.method?params.method:"GET");var request=new EJS.newRequest();request.onreadystatechange=function(){if(request.readyState==4){if(request.status==200){params.onComplete(request)}else{params.onComplete(request)}}};request.open(params.method,params.url);request.send(null)}})();EJS.Helpers.prototype.date_tag=function(C,O,A){if(!(O instanceof Date)){O=new Date()}var B=["January","February","March","April","May","June","July","August","September","October","November","December"];var G=[],D=[],P=[];var J=O.getFullYear();var H=O.getMonth();var N=O.getDate();for(var M=J-15;M<J+15;M++){G.push({value:M,text:M})}for(var E=0;E<12;E++){D.push({value:(E),text:B[E]})}for(var I=0;I<31;I++){P.push({value:(I+1),text:(I+1)})}var L=this.select_tag(C+"[year]",J,G,{id:C+"[year]"});var F=this.select_tag(C+"[month]",H,D,{id:C+"[month]"});var K=this.select_tag(C+"[day]",N,P,{id:C+"[day]"});return L+F+K};EJS.Helpers.prototype.form_tag=function(B,A){A=A||{};A.action=B;if(A.multipart==true){A.method="post";A.enctype="multipart/form-data"}return this.start_tag_for("form",A)};EJS.Helpers.prototype.form_tag_end=function(){return this.tag_end("form")};EJS.Helpers.prototype.hidden_field_tag=function(A,C,B){return this.input_field_tag(A,C,"hidden",B)};EJS.Helpers.prototype.input_field_tag=function(A,D,C,B){B=B||{};B.id=B.id||A;B.value=D||"";B.type=C||"text";B.name=A;return this.single_tag_for("input",B)};EJS.Helpers.prototype.is_current_page=function(A){return(window.location.href==A||window.location.pathname==A?true:false)};EJS.Helpers.prototype.link_to=function(B,A,C){if(!B){var B="null"}if(!C){var C={}}if(C.confirm){C.onclick=' var ret_confirm = confirm("'+C.confirm+'"); if(!ret_confirm){ return false;} ';C.confirm=null}C.href=A;return this.start_tag_for("a",C)+B+this.tag_end("a")};EJS.Helpers.prototype.submit_link_to=function(B,A,C){if(!B){var B="null"}if(!C){var C={}}C.onclick=C.onclick||"";if(C.confirm){C.onclick=' var ret_confirm = confirm("'+C.confirm+'"); if(!ret_confirm){ return false;} ';C.confirm=null}C.value=B;C.type="submit";C.onclick=C.onclick+(A?this.url_for(A):"")+"return false;";return this.start_tag_for("input",C)};EJS.Helpers.prototype.link_to_if=function(F,B,A,D,C,E){return this.link_to_unless((F==false),B,A,D,C,E)};EJS.Helpers.prototype.link_to_unless=function(E,B,A,C,D){C=C||{};if(E){if(D&&typeof D=="function"){return D(B,A,C,D)}else{return B}}else{return this.link_to(B,A,C)}};EJS.Helpers.prototype.link_to_unless_current=function(B,A,C,D){C=C||{};return this.link_to_unless(this.is_current_page(A),B,A,C,D)};EJS.Helpers.prototype.password_field_tag=function(A,C,B){return this.input_field_tag(A,C,"password",B)};EJS.Helpers.prototype.select_tag=function(D,G,H,F){F=F||{};F.id=F.id||D;F.value=G;F.name=D;var B="";B+=this.start_tag_for("select",F);for(var E=0;E<H.length;E++){var C=H[E];var A={value:C.value};if(C.value==G){A.selected="selected"}B+=this.start_tag_for("option",A)+C.text+this.tag_end("option")}B+=this.tag_end("select");return B};EJS.Helpers.prototype.single_tag_for=function(A,B){return this.tag(A,B,"/>")};EJS.Helpers.prototype.start_tag_for=function(A,B){return this.tag(A,B)};EJS.Helpers.prototype.submit_tag=function(A,B){B=B||{};B.type=B.type||"submit";B.value=A||"Submit";return this.single_tag_for("input",B)};EJS.Helpers.prototype.tag=function(C,E,D){if(!D){var D=">"}var B=" ";for(var A in E){if(E[A]!=null){var F=E[A].toString()}else{var F=""}if(A=="Class"){A="class"}if(F.indexOf("'")!=-1){B+=A+'="'+F+'" '}else{B+=A+"='"+F+"' "}}return"<"+C+B+D};EJS.Helpers.prototype.tag_end=function(A){return"</"+A+">"};EJS.Helpers.prototype.text_area_tag=function(A,C,B){B=B||{};B.id=B.id||A;B.name=B.name||A;C=C||"";if(B.size){B.cols=B.size.split("x")[0];B.rows=B.size.split("x")[1];delete B.size}B.cols=B.cols||50;B.rows=B.rows||4;return this.start_tag_for("textarea",B)+C+this.tag_end("textarea")};EJS.Helpers.prototype.text_tag=EJS.Helpers.prototype.text_area_tag;EJS.Helpers.prototype.text_field_tag=function(A,C,B){return this.input_field_tag(A,C,"text",B)};EJS.Helpers.prototype.url_for=function(A){return'window.location="'+A+'";'};EJS.Helpers.prototype.img_tag=function(B,C,A){A=A||{};A.src=B;A.alt=C;return this.single_tag_for("img",A)}