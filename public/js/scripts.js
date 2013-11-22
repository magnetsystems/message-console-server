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
    var title = $('.title_container');
    var menu = title.find('.dropdown-menu');
    title.find('.dropdown').unbind('mouseenter').mouseenter(function(){
        menu.css('display', 'block');
    }).unbind('mouseleave').mouseleave(function(){
        menu.css('display', 'none');
    });
    var resources = new ResourceNavigation();
    var docFormatter = new DocFormatter();
    initPlaceholders();
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

function doAuth(cookies){
    if(window.location.pathname.indexOf('/login') == -1){
        // session timeout notification is disabled
        var sessionMgr = new SessionManager(cookies);
        $(document).ajaxComplete(function(e, xhr){
            if(xhr.status == 278){
                window.location.href = '/login/';
            }else if(xhr.status == 279){
                window.location.href = '/login/?status=locked';
            }else{
                sessionMgr.reset(true);
            }
        });
        getBeacon();
        if(!checkLogin(cookies)){
            /*
            getProfile(cookies, function(){
                setProfile(cookies);
            });
            */
        }else{
            setProfile(cookies);
        }
    }else{
        //document.cookie = 'connect.sid=;domain=.'+window.location.hostname+';path=/';
        cookies.remove('magnet_auth');
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
                    alert.find('.modal-body p').html('Registration has failed. Please contact Magnet support for assistance.');
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
        if(xhr.status == 500){
            var res = tryParseJSON(xhr.responseText);
            if(res && res.message){
                msg = res.message;
            }
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
    }).done(function(){
        endLoading(me.domId, {
            title : 'Invitation Confirmation Submitted Successfully',
            text  : 'Your invitation confirmation has been sent successfully. An administrator will review your application and contact you through email.'
        });
        $('#'+me.domId+' .modal_errors, #btn-confirm-invitation').hide();
    }).fail(function(xhr){
        endLoading(me.domId);
        var msg = 'A server error occurred during invitation confirmation. Please try again later.';
        if(xhr.status == 500){
            var res = tryParseJSON(xhr.responseText);
            if(res && res.message){
                msg = res.message;
            }
        }
        if(msg.indexOf('invit_req_pending') || msg.indexOf('finish') != -1){
            endLoading(me.domId, {
                title : 'Invitation Confirmation Submitted Successfully',
                text  : 'Your invitation confirmation has been sent successfully. An administrator will review your application and contact you through email.'
            });
            $('#'+me.domId+' .modal_errors, #btn-confirm-invitation').hide();
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
        var msg = 'A server error occurred during registration. Please try again later.';
        if(xhr.status == 500){
            var res = tryParseJSON(xhr.responseText);
            if(res && res.message){
                msg = res.message;
            }
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
    /*
    $('#contact-form input').keypress(function(e){
        if(e.keyCode == 13){
            me.contact();
        }
    });
    */
}
ContactForm.prototype.contact = function(){
    var me = this;
    me.info = {};
    $('#contact-form input, #contact-form select, #contact-form textarea').each(function(){
        me.info[$(this).attr('name')] = $(this).val();
    });
    delete me.info.name;
    delete me.info.emailAddress;
    if(me.validator.validateContactForm()){
        me.call();
    }
}
ContactForm.prototype.call = function(){
    var me = this;
    $.ajax({  
        type        : 'POST',  
        url         : '/rest/contactUs',
        dataType    : 'html',
        data        : me.info
    }).done(function(result, status, xhr){
        $('#contact-form .well').html('<h4>Contact Us</h4><p class="subheading">Thank you for submitting your contact request. A Magnet representative will follow up with you shortly.</p>');
    }).fail(function(){
        me.validator.showError('Contact Request Failure', 'A server error occurred sending out the contact request. Please try again later.');
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
Validator.prototype.validateLogin = function(){
	if($('#username').val() == ''){
		this.showError('Required Field Missing', 'Please enter a valid email address');
		return false;
	}else if($('#password').val() == ''){
		this.showError('Required Field Missing', 'Please enter a valid password');
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
        if($.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder')){
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
    $('#contact-form input[name!="captcha"], #contact-form select, #contact-form textarea').each(function(){
        if($.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder')){
            me.showError('Required Field Missing', 'Please enter a '+$(this).attr('placeholder'));
            valid = false;
        }
    });
    var emailRxp = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
	if(!emailRxp.test($('#contact-form input[name="emailAddress"]').val())){
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

// parse a string into JSON or return false
function tryParseJSON(str){
    try{
        return JSON.parse(str);
    }catch(e){
        return false;
    }
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
    me.className = '.TitleChapterTOC, .Heading1TOC, .Heading2TOC, .Heading3TOC, .Title-Release-Note';
    if(window.location.href.indexOf('release_notes') != -1){
        $('#doc-toc').html($(me.className).html());
        return false;
    }
    me.el = $(this.className);
    me.destination = $('#doc-toc');
    if(me.destination.length){
        me.el.closest('div').appendTo(me.destination);
        $('.Copyright').remove();
        $('.Address').closest('div').remove();
        $('.BookTitle').find('br').remove();
        me.el.find('.Index').each(function(){
            me.initUI($(this));
        });
        me.bindClick();
        me.bindToggle();
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
    switcher.html('<a href="/docs/" class="btn">Return To Documentation</a><a did="print" class="btn" href="'+pdfPath+'">Download PDF</a><button did="on" class="btn" style="display:none">View By Chapter</button><button did="off" class="btn">View Entire Guide</button>');
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
        $('.doc-section').hide();
        tocList.css('font-weight', 'normal');
        var id = $(this).attr('href').replace('index.html#', '');
        $('a[name="'+id+'"]').closest('.doc-section').show();
    });
}
DocFormatter.prototype.updateUI = function(dom){
    $('.doc-section').hide();
    var parent = dom.parent();
    if(parent.attr('class') == 'TitleChapterTOC' || 1 == 1){
        parent.closest('div').find('.Index').each(function(){
            $(this).css('font-weight', 'bold');
            var id = $(this).attr('href').replace('index.html#', '');
            $('.doc-section[did="'+id+'"]').show();
        });
    }else{
        dom.css('font-weight', 'bold');
        var id = dom.attr('href').replace('index.html#', '');
        $('.doc-section[did="'+id+'"], a[name="'+id+'"]').show();
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
        if(hash){
            page.find('.nav-tabs li').removeClass('active');
            page.find('.tab-pane').removeClass('active');
            page.find(hash).addClass('active');
            page.find('.nav-tabs a[href="'+hash+'"]').closest('li').addClass('active');
        }
        page.find('.nav-tabs li a').click(function(e){
            e.preventDefault();
            var link = $(e.currentTarget);
            var li = link.closest('li');
            var list = li.closest('.nav-tabs');
            list.find('li').removeClass('active');
            page.find('.tab-pane').removeClass('active');
            page.find(link.attr('href')).addClass('active');
            li.addClass('active');
        });
        $('#gs-site-menu li a').click(function(){
            var link = $('.nav-tabs li a[href="'+$(this).attr('href').replace('/get-started/', '')+'"]');
            var li = link.closest('li');
            var list = li.closest('.nav-tabs');
            list.find('li').removeClass('active');
            page.find('.tab-pane').removeClass('active');
            page.find(link.attr('href')).addClass('active');
            li.addClass('active');
        })
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