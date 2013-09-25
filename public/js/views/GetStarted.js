define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: '#get-started',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('iniGetStarted', function(){
                me.render();
            });
            me.options.eventPubSub.bind('coreComplete', function(isPrevious){
                me.storeDetails(isPrevious);
            });
        },
        events: {
            'click #pw-apns-cert-file-btn' : 'uploadCertificate',
            'click #pw-apns-list li i' : 'removeCert'
        },
        render: function(){
            var template = _.template($('#GetStartedView').html());
            this.$el.find('#mgmt-settings dl').html(template);
            return this;
        },
    });
    return View;
});