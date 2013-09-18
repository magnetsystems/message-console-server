define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: '#pw-samples',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initPWSamplesView', function(params){
                me.project = params.project;
                me.render(params.view);
            });
            me.options.eventPubSub.bind('samplesComplete', function(isPrevious){
                me.storeDetails(isPrevious);
            });
        },
        // store project details form data into data object
        storeDetails: function(isPrevious){
            var me = this;
            var properties = utils.collect(me.$el);
            var projectSetting = me.project.get('projectSetting');
            me.options.mc.query('projects/'+me.project.attributes.magnetId+'/setProjectConfig', 'POST', properties.api, function(){
                $.extend(projectSetting, properties.config);
                if(!isPrevious){
                    me.options.eventPubSub.trigger('PWNextTransition', 'samples');
                }
            }, null, null, function(){
                Alerts.Error.display({
                    title   : 'Error Setting Properties',
                    content : 'There was an error setting the project properties. Please contact Magnet support.'
                });
                $('.button-group[did="samples"]').removeClass('hidden');
            });
        },
        // render sample services configuration
        render: function(view){
            var template = _.template($('#PWSamplesView').html(), {
                project : this.project,
                view    : view
            });
            $('#pw-samples-form').html(template);
            if(view){
                this.options.eventPubSub.trigger('PWToggleAccordion', view);
            }
            return this;
        }
    });
    return View;
});