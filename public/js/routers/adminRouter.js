define(['jquery', 'backbone','views/AlertGeneralView','views/AlertConfirmView','views/AlertErrorView','views/GlobalView','models/UserModel', 'views/AdminView', 'views/ListView', 'views/AdminDetailsView'], function($, Backbone, AlertGeneralView, AlertConfirmView, AlertErrorView, GlobalView, UserModel, AdminView, ListView, AdminDetailsView){
    // bind alerts
    Alerts.General = new AlertGeneralView();
    Alerts.Confirm = new AlertConfirmView();
    Alerts.Error = new AlertErrorView();
    // main router
    var Router = Backbone.Router.extend({
        initialize: function(){
            var me = this;
            // establish event pub/sub 
            this.eventPubSub = _.extend({}, Backbone.Events);
            // init HTTP request methods
            this.cookies = new Cookie();
            // session timeout notification is disabled
            this.sessionMgr = new SessionManager(this.cookies);
            $(document).ajaxComplete(function(e, xhr){
                if(xhr.status == 278){
                    window.location.href = '/login/';
                }else{
                    me.sessionMgr.reset();
                }
            });
            this.httpreq = new HTTPRequest('/rest/', this.cookies);
            // init model connector for REST 
            this.mc = new ModelConnector(this.httpreq);
            utils.setIndexOf();
            // init site views
            var gv = new GlobalView({eventPubSub:this.eventPubSub});
            var lstv = new ListView({mc:this.mc, eventPubSub:this.eventPubSub});
            var av = new AdminView({mc:this.mc, eventPubSub:this.eventPubSub});
            var adv = new AdminDetailsView({mc:this.mc, eventPubSub:this.eventPubSub});
            // define models
            this.profile = new UserModel();
            // override default backbone model sync method to be compatible with REST APIs
            syncOverride(this.mc, this.eventPubSub);
            Backbone.history.start();
            this.initGetIdentity();
        },
        routes: {
            'login'     : 'login',
            'logout'    : 'logout',
            ''          : 'admin',
            '/:page'    : 'admin',
            ':page/:id' : 'admin',
            '*notFound' : 'admin'
        },
        admin: function(page, id){
            var me = this;
            me.auth(function(){
                if(id){
                    me.eventPubSub.trigger('resetPages', 'admin-details');
                    me.eventPubSub.trigger('initAdminDetailsView', {page:page, magnetId:id});
                }else{
                    me.eventPubSub.trigger('resetPages', 'admin');
                    me.eventPubSub.trigger('initAdminView', page);
                }
            });
        },
        login: function(){
            var me = this;
            me.auth(function(){
                Backbone.history.navigate('#/');
            });
        },
        auth: function(callback){
            // stop any active polling threads
            timer.stop();
            callback();
        },
        unsetUserPanel: function(){
            $('.control-buttons').addClass('hidden');
            $('#user-panel').hide();
            $('#username-placeholder').text('');
            $('.user-username').html('');
        },
        setUserPanel: function(username, name, company){
            $('#username-placeholder').text(username);
            $('.user-username').html(name);
            $('.user-company').html(company);
            $('#login-container').addClass('hidden');
            $('.control-buttons').removeClass('hidden');
        },
        logout: function(){
            var me = this;
            me.profile = null;
            me.cookies.remove('magnet_auth');
            $('.control-buttons').addClass('hidden');
            me.mc.query('logout', 'POST', null, function(data, status, xhr){
                window.location.href = '/login/';
            }, 'html', 'application/x-www-form-urlencoded', function(){
                me.login();
            });
        },
        // get profile of the current user
        getProfile: function(callback){
            var me = this;
            me.profile = new UserModel();
            me.profile.fetch({
                data: {
                    relationship : {
                        name   : 'profile', 
                        magnetId : '@me'
                    }
                },
                success: function(){
                    if(typeof callback == typeof Function){
                        callback();
                    }
                },
                error: function(){
                    console.log('error retrieving user profile');
                }
            });
        },
        // get identify of the current user
        getIdentity: function(callback){
            var me = this;
            me.user = new UserModel({
                id       : '@me',
                magnetId : '@me'
            });
            me.user.fetch({
                success: function(user){
                    callback(user);
                },
                error: function(){
                    console.log('error retrieving user');
                }
            });
        },
        initGetIdentity: function(){
            var me = this;
            me.eventPubSub.bind('getUserIdentity', function(callback){
                me.getIdentity(function(model){
                    callback(model);
                });
            });
        }
    });
    return Router;
});
var Alerts = {};