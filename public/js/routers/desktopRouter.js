define(['jquery', 'backbone','views/AlertGeneralView','views/AlertConfirmView','views/AlertErrorView','views/GlobalView','views/ProjectWizardView'], function($, Backbone, AlertGeneralView, AlertConfirmView, AlertErrorView, GlobalView, ProjectWizardView){
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
            this.cookies = new Cookie();
            // session timeout notification is disabled
            //this.sessionMgr = new SessionManager(this.cookies);
            $(document).ajaxComplete(function(e, xhr){
                if(xhr.status == 278){
                    window.location.href = '/login/';
                }else if(xhr.status == 279){
                    window.location.href = '/login/?status=locked';
                }else{
                    //me.sessionMgr.reset();
                }
            });
            // init HTTP request methods
            this.httpreq = new HTTPRequest('/rest/', this.cookies);
            // init model connector for REST 
            this.mc = new ModelConnector(this.httpreq);
            utils.setIndexOf();
            this.GLOBAL = {};
            // init site views
            var userInvitation = new FriendInvitation();
            var gv = new GlobalView({eventPubSub:this.eventPubSub});
            var pwv = new ProjectWizardView({mc:this.mc, router:this, eventPubSub:this.eventPubSub});
            // override default backbone model sync method to be compatible with Magnet REST APIs
            syncOverride(this.mc, this.eventPubSub);
            Backbone.history.start();
            this.initSendSupport();
        },
        routes: {
            ''                   : 'projectWizard',
            'project-wizard'     : 'projectWizard',
            'project-wizard/:id' : 'projectWizard',
            '*notFound'          : 'projectWizard'
        },
        projectWizard: function(id){
            var me = this;
            me.auth(function(){
                me.eventPubSub.trigger('resetPages', 'project-wizard');
                me.eventPubSub.trigger('initProjectWizard', {id:id});
            });
        },
        auth: function(callback){
            // stop any active polling threads
            timer.stop();
            callback();
        },
        // init pub sub to send a support notification
        initSendSupport: function(){
            var me = this;
            me.eventPubSub.bind('sendSupportNotification', function(data){
                me.sendSupportNotification(data);
            });
        },
        // send a support notification to Magnet support
        sendSupportNotification: function(data){
            $.ajax({
                type     : 'POST',
                url      : '/rest/contactUs',
                dataType : 'html',
                data     : {
                    reason  : data.type,
                    message : 'Project Name: ' + data.json.name // JSON.stringify(data.json)
                }
            });
        }
    });
    return Router;
});
var Alerts = {};