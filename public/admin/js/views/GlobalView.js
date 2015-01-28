define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: "body",
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind("btnLoading", function(btn){
                btn.attr('txt', btn.html()).html('Loading..').addClass('disabled');
            });
            me.options.eventPubSub.bind("btnComplete", function(btn){
                btn.html(btn.attr('txt')).removeClass('disabled');
            });
            me.options.eventPubSub.bind('resetPages', function(page){
                me.selectPage(page);
            });
            me.options.eventPubSub.bind('resetAdminPages', function(page){
                me.selectPage(page, '.page');
            });
        },
        events: {
            'click .goBack': 'goBack',
            'click .btn-logout': 'logout',
            'click #user-panel-toggle': 'toggleUserPanel',
            'click #create-messaging-app-btn' : 'createMessagingApp'
        },
        goBack: function(e){
            e.preventDefault();
            window.history.back();
        },
        logout: function(){
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
        },
        toggleUserPanel: function(e){
            e.preventDefault();
            var dom = $('#user-panel');
            if(dom.css('display') == 'block'){
                dom.slideUp('fast');
            }else{
                dom.slideDown('fast');
            }
        },
        selectPage: function(page, view){
            $('#user-panel').slideUp('fast');
            var pages = $(view || '.page-view');
            pages.addClass('hidden');
            if(page){
                $('#'+page).removeClass('hidden');
            }
        },
        createMessagingApp: function(){
            this.options.eventPubSub.trigger('createMessagingApp');
        }
    });
    return View;
});