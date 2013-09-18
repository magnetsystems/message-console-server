define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: "#login-container",
        initialize: function(){
            var me = this;
            var lc = new LoginController();
            this.lv = new LoginValidator();
            // vertical alignment
            $.fn.vAlign = function(){
                return this.each(function(i){
                    var ah = $(this).height();
                    var ph = $(document).height();
                    var mh = Math.ceil((ph-ah) / 2);
                    $(this).css('margin-top', mh-10);
                });
            };
            $(window).resize(function(){
                $('.valign').vAlign();
            });
            me.options.eventPubSub.bind("initLogin", function(callback){
                me.options.eventPubSub.trigger("disableOffice");
                me.$el.removeClass('hidden');
                $('.valign').vAlign();
                me.callback = callback;
                $('#pass-tf').val('');
                $('#user-tf').focus();
            });
        },
        events: {
            "click #btn-login": "login",
            "keypress input[type=text]": "filterOnEnter",
            "keypress input[type=password]": "filterOnEnter"
        },
        login: function(){
            var me = this;
            if(me.lv.validateForm() === true){
                var username = $('#user-tf').val();
                me.options.mc.query('login', 'POST', {
                    authority : 'magnet',
                    name      : username,
                    password  : $('#pass-tf').val()
                }, function(data, status, xhr){
                    if(xhr.status == 200){
                        if(xhr.responseText == 'INCORRECT_USERNAME_PASSWORD'){
                            me.lv.showLoginError('Login Failure', 'Please check your username and password.');
                        }else if(xhr.responseText == 'UNAUTHORIZED'){
                            me.lv.showLoginError('Not Authorized', 'You are not authorized to access this application.');
                        }else{
                            $('#pass-tf').val('');
                            $('#username-placeholder').text(username);
                            me.options.eventPubSub.trigger('getUserProfile', function(profile){
                                me.options.cookies.create('magnet_auth', profile.attributes['eMails'][0]+'|'+profile.attributes.firstName+' '+profile.attributes.lastName+'|'+profile.attributes.companyName, 1);
                                $('.user-username').html(profile.attributes.firstName+' '+profile.attributes.lastName);
                                $('.user-company').html(profile.attributes.companyName == 'undefined' ? '' : profile.attributes.companyName);
                                me.$el.addClass('hidden');
                                $('.control-buttons').removeClass('hidden');
                                if(typeof me.callback === typeof Function){
                                    me.callback();
                                }
                            });
                        }
                    }
                }, 'html', 'application/x-www-form-urlencoded', function(){
                    me.lv.showLoginError('Login Failure', 'Please check your username and/or password');
                }, [{name: "X-Login-Intent", val:"MEM"}]);
            }
        },
        filterOnEnter: function(e){
            if(e.keyCode != 13){
                return;
            }else{
                this.login();
            }
        }
    });
    return View;
});

/* CONTROLLERS */

function LoginController(){
    // bind event listeners to button clicks
	$('#forgot-password').click(function(){
        $('#get-credentials').modal('show');
    });
    // automatically toggle focus between the email modal window and the login form
    $('#get-credentials').on('shown', function(){ 
        $('#email-tf').focus(); 
    }).on('hidden', function(){
        $('#user-tf').focus(); 
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

function LoginValidator(){
    // bind a simple alert window to this controller to display any errors
	this.loginErrors = $('.modal-alert');
	this.loginErrors.modal({
        show     : false, 
        keyboard : true, 
        backdrop : true
    });
}
LoginValidator.prototype.showLoginError = function(t, m){
    $('.modal-alert .modal-header h3').text(t);
    $('.modal-alert .modal-body p').text(m);
    this.loginErrors.modal('show');
}
LoginValidator.prototype.validateForm = function(){
	if ($('#user-tf').val() == ''){
		this.showLoginError('Required Field Missing', 'Please enter a valid username');
		return false;
	}else if($('#pass-tf').val() == ''){
		this.showLoginError('Required Field Missing', 'Please enter a valid password');
		return false;
	}else{
		return true;
	}
}