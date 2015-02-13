$(document).ready(function(){
    Alerts.init();
    var ajaxauth = new AJAXLogin();
});

function AJAXLogin(){
    var me = this;
    me.domId = 'login-container';
    me.container = $('#'+me.domId);
    var btn = $('#login-btn');
    if(me.container.length){
        btn.click(function(){
            me.login(btn);
        });
        me.container.find('input').keypress(function(e){
            if(e.keyCode == 13) me.login(btn);
        });
    }
}
AJAXLogin.prototype.login = function(btn){
    var me = this;
    var obj = utils.collect(me.container);
    if(!$.trim(obj.name).length){
        Alerts.Error.display({
            title   : 'Required Field Missing',
            content : 'Please enter a valid email address.'
        });
        return utils.showError(me.container, 'name', 'Please enter a valid email address.');
    }else if(!$.trim(obj.password).length){
        Alerts.Error.display({
            title   : 'Required Field Missing',
            content : 'Please enter a valid password'
        });
        return utils.showError(me.container, 'password', 'Please enter a valid password');
    }
    btn.html('Please Wait..').addClass('disabled');
    $.ajax({
        type        : 'POST',
        url         : '/rest/login',
        dataType    : 'html',
        contentType : 'application/x-www-form-urlencoded',
        data        : obj
    }).done(function(){
        AJAX('/rest/profile', 'GET', 'application/x-www-form-urlencoded', null, function(res, status, xhr){
            res.firstName = res.firstName || '';
            res.lastName = res.lastName || '';
            Cookie.create('magnet_auth', res.firstName+':'+res.lastName+':'+res.email, 1);
            window.location.href = '/admin';
        }, function(xhr, status, thrownError){
            alert(xhr.responseText);
        });
    }).fail(function(xhr){
        btn.html('Sign In').removeClass('disabled');
        if(xhr.responseText == 'invalid-login'){
            Alerts.Error.display({
                title   : 'Login Failure',
                content : 'Please check your username and password.'
            });
        }else{
            Alerts.Error.display({
                title   : 'Not Authorized',
                content : 'You are not authorized to access this application.'
            });
        }
    });
}

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
