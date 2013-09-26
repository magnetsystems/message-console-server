define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: '#get-started',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initGetStarted', function(){

            });
        },
        events: {
            'click .nav-tabs li a' : 'toggleTab'
        },
        toggleTab: function(e){
            e.preventDefault();
            var link = $(e.currentTarget);
            var li = link.closest('li');
            var list = li.closest('.nav-tabs');
            list.find('li').removeClass('active');
            this.$el.find('.tab-pane').removeClass('active');
            this.$el.find(link.attr('href')).addClass('active');
            li.addClass('active');
        }
    });
    return View;
});