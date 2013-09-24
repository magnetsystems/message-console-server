define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: '#pw-summary',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initPWSummaryView', function(params){
                me.project = params.project;
                me.render();
                me.displayProjectEdit();
                console.log('got here');
                $('#download-config-file').attr('href', '/rest/projects/'+me.project.attributes.magnetId+'/getConfig');
            });
        },
        events: {
            'click .summary-text a' : 'disableLink'
        },
        disableLink: function(){
            return false;
        },
        render: function(){
            var template = _.template($('#PWSummaryView').html(), {
                project : this.project
            });
            $('#pw-summary-form').html(template);
            $('.summary-text a').tooltip();
            return this;
        },
        displayProjectEdit: function(){
            $('#project-name-editor').html(this.project.attributes.name+' <i class="icon-edit"></i>');
        }
    });
    return View;
});