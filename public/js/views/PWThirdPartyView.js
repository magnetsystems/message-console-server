define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: '#pw-thirdparty',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initPWThirdPartyView', function(params){
                me.project = params.project;
                me.render(params.view);
            });
            me.options.eventPubSub.bind('thirdpartyComplete', function(isPrevious){
                me.storeDetails(isPrevious);
            });
        },
        // store project details form data into data object
        storeDetails: function(isPrevious){
            var me = this;
            var properties = utils.collect(me.$el);
            $('.button-group[did="thirdparty"]').removeClass('hidden');
            var validation = validator.isInvalid(properties.config);
            if(validation){
                Alerts.Confirm.display({
                    title   : 'Parameters Not Filled Out',
                    content : 'The '+validation.text+' feature'+(validation.ary.length == 1 ? ' was' : 's were')+' included, but not all the parameters were filled out. You can continue, but the project will not be able to deploy to your sandbox in the cloud.'
                }, function(){
                    me.save(properties, isPrevious);
                });
            }else{
                me.save(properties, isPrevious);
            }
        },
        save: function(properties, isPrevious){
            var me = this, btnGroup = $('.button-group[did="thirdparty"]');
            btnGroup.addClass('hidden');
            var projectSetting = me.project.get('projectSetting');
            me.options.mc.query('projects/'+me.project.attributes.magnetId+'/setProjectConfig', 'POST', properties.api, function(){
                $.extend(projectSetting, properties.config);
                if(!isPrevious){
                    me.options.eventPubSub.trigger('PWNextTransition', 'thirdparty');
                }
            }, null, null, function(){
                Alerts.Error.display({
                    title   : 'Error Setting Properties',
                    content : 'There was an error setting the project properties. Please contact Magnet support.'
                });
                btnGroup.removeClass('hidden');
            });
        },
        // render third party service configuration
        render: function(view){
            var template = _.template($('#PWThirdPartyView').html(), {
                project : this.project,
                view    : view
            });
            $('#pw-thirdparty-form').html(template);
            if(view){
                this.options.eventPubSub.trigger('PWToggleAccordion', view);
            }
            return this;
        }
    });
    return View;
});