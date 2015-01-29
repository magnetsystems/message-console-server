define([
    'jquery','backbone','views/AlertGeneralView','views/AlertConfirmView','views/AlertErrorView','views/GlobalView', 'views/WizardView'
], function($, Backbone, AlertGeneralView, AlertConfirmView, AlertErrorView, GlobalView, WizardView){
    Alerts.General = new AlertGeneralView();
    Alerts.Confirm = new AlertConfirmView();
    Alerts.Error = new AlertErrorView();
    // main router
    var Router = Backbone.Router.extend({
        initialize: function(){
            var me = this;
            // establish event pub/sub
            this.eventPubSub = _.extend({}, Backbone.Events);
            this.opts = {};
            utils.setIndexOf();
            // init site views
            var gv = new GlobalView({opts:this.opts, eventPubSub:this.eventPubSub});
            var pwv = new WizardView({opts:this.opts, eventPubSub:this.eventPubSub});
            Backbone.history.start();
        },
        routes: {
            ''          : 'wizard',
            '*notFound' : 'handleNotFound'
        },
        wizard: function(){
            this.eventPubSub.trigger('resetGlobalPages', 'wizard-container');
            this.eventPubSub.trigger('initWizardView');
        },
        handleNotFound: function(){
            this.wizard();
        }
    });
    return Router;
});
var Alerts = {};