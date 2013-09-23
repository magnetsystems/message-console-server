define(['jquery', 'backbone', 'models/ProjectModel'], function($, Backbone, ProjectModel){
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
            var me = this, btnGroup = $('.button-group[did="samples"]');
            var properties = utils.collect(me.$el);
            btnGroup.addClass('hidden');
            var proj = new ProjectModel();
            proj.set({
                magnetId : me.project.attributes.magnetId,
                id       : me.project.attributes.id
            });
            proj.save(properties.config, {
                success: function(){
                    me.project.set(properties.config);
                    if(!isPrevious){
                        me.options.eventPubSub.trigger('PWNextTransition', 'samples');
                    }
                },
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Setting Properties',
                        content : 'There was an error setting the project properties. Please contact Magnet support.'
                    });
                    btnGroup.removeClass('hidden');
                }
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