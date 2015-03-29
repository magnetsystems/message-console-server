define(['jquery', 'backbone','views/AlertGeneralView','views/AlertConfirmView','views/AlertErrorView','views/GlobalView',
    'models/UserModel', 'views/AdminView', 'views/ListView', 'views/AdminDetailsView', 'views/ProfileView'], function(
    $, Backbone, AlertGeneralView, AlertConfirmView, AlertErrorView, GlobalView, UserModel, AdminView, ListView, AdminDetailsView, ProfileView){
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
            // session timeout notification is disabled
            this.opts = {};
//            this.sessionMgr = new SessionManager();
            $(document).ajaxComplete(function(e, xhr){
                if(xhr.skipStatusCheck) return;
                if(xhr.status == 278){
                    window.location.href = '/';
                }else if(xhr.status == 279){
                    window.location.href = '/?status=locked';
                }else{
//                    me.sessionMgr.reset();
                }
            });
            this.httpreq = new HTTPRequest('/rest/');
            // init model connector for REST 
            this.mc = new ModelConnector(this.httpreq);
            utils.setIndexOf();
            // init site views
            var gv = new GlobalView({opts:this.opts, eventPubSub:this.eventPubSub});
            var lstv = new ListView({opts:this.opts, mc:this.mc, eventPubSub:this.eventPubSub});
            var av = new AdminView({opts:this.opts, mc:this.mc, eventPubSub:this.eventPubSub});
            var adv = new AdminDetailsView({opts:this.opts, mc:this.mc, eventPubSub:this.eventPubSub});
            var pv = new ProfileView({opts:this.opts,mc:this.mc, router:this, eventPubSub:this.eventPubSub});
            // define models
            // override default backbone model sync method to be compatible with REST APIs
            syncOverride(this.mc, this.eventPubSub);
            Backbone.history.start();
        },
        routes: {
            'login'     : 'login',
            ''          : 'admin',
            '/:page'    : 'admin',
            ':page/:id' : 'admin',
            '*notFound' : 'admin'
        },
        admin: function(page, id){
            var me = this;
            me.auth(function(){
                if(id){
                    me.eventPubSub.trigger('initAdminDetailsView', {page:page, magnetId:id});
                }else{
                    me.eventPubSub.trigger('resetAdminPages', 'admin');
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
            var me = this;
            timer.stop();
            var popover = $('#user-nav-popover');
            popover.popover('hide');
            if(!me.opts.user){
                me.eventPubSub.trigger('getUserProfile', callback);
            }else{
                callback();
            }
        }
    });
    return Router;
});
var Alerts = {};