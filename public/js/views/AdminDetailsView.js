define(['jquery', 'backbone', 'models/UserModel', 'collections/ProjectCollection'], function($, Backbone, UserModel, ProjectCollection){
    var View = Backbone.View.extend({
        el: "#admin-details",
        initialize: function(){
            var me = this;
            // initialize the view
            me.options.eventPubSub.bind('initAdminDetailsView', function(params){
                me.page = params.page;
                me.$el.find('.page-view').html('<img src="/images/ajax-loader.gif" style="padding:8px">');
                me.fetchUser(params);
            });
        },
        events: {
            'click button[did="delete-user"]': 'deleteUser',
            'click button[did="activate-account"]': 'activateAccount',
            'click button[did="deactivate-account"]': 'activateAccount',
            'click button[did="approve-user"]': 'approveUser',
            'click button[did="deny-user"]': 'approveUser'
        },
        // fetch a user entity object from server
        fetchUser: function(params){
            var me = this;
            me.entity = new UserModel({
                magnetId : params.magnetId,
                id       : params.magnetId.slice(params.magnetId.lastIndexOf(':')+1)
            });
            me.entity.fetch({
                success: function(){
                    me.render('User');
                    me.fetchProjects();
                }, 
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Retrieving User',
                        content : 'There was a problem retrieving this user. Please try again later.'
                    });
                }
            });
        },
        // fetch a collection of projects from the server
        fetchProjects: function(){
            var me = this;
            me.projects = new ProjectCollection();
            me.projects.fetch({
                data: {
                    search : [{
                        owner : me.entity.attributes.magnetId
                    }]
                },
                success: function(){
                    me.renderProjects();
                },
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Retrieving Projects',
                        content : 'There was a problem retrieving this project collection. Please try again later.'
                    });
                }
            });
        },
        renderProjects: function(){
            this.$el.find('#project-list-container').html(_.template($('#ProjectListView').html(), {
                col : this.projects.models
            }));
        },
        render: function(type){
            var template = _.template($('#Admin'+type+'DetailsView').html(), {
                model : this.entity.attributes, 
                page  : this.page
            });
            this.$el.find('.page-view').html(template);
            return this;
        },
        // delete the current user
        deleteUser: function(){
            var me = this;
            Alerts.Confirm.display({
                title   : 'Confirm User Deletion', 
                content : 'Are you sure you wish to delete this user? Please note that once this user has been deleted, it cannot be recovered.'
            }, function(){
                me.entity.destroy({
                    success: function(){
                        Backbone.history.navigate('#/'+me.page);
                        Alerts.General.display({
                            title   : 'User Deleted Successfully', 
                            content : 'The selected user has been deleted successfully. Returning to administration page.'
                        });
                    },
                    error: function(){
                        Alerts.Error.display({
                            title   : 'Error Deleting User', 
                            content : 'There was an error deleting the selected user.'
                        });
                    }
                });
            });
        },
        // approve or deny the invitation request
        approveUser: function(e){
            var me = this;
            var state = $(e.currentTarget).attr('did') == 'approve-contact' ? 'true' : 'false';
            var text = state == 'true' ? 'Approved' : 'Denied';
            me.showLoading($(e.currentTarget));
            me.options.mc.query('users/'+me.entity.attributes.magnetId+'/approve', 'PUT', null, function(){
                me.hideLoading($(e.currentTarget));
                me.$el.find('.btn.btn-primary').hide();
                Alerts.General.display({
                    title   : 'User '+text+' Successfully', 
                    content : 'The user has been '+text.toLowerCase()+' successfully.'
                });
            }, null, 'text/plain', function(xhr, status, error){
                me.hideLoading($(e.currentTarget));
                var res = xhr.responseText;
                if(res && res.message){
                    Alerts.Error.display({
                        title   : 'Error Sending Request', 
                        content : res.message
                    });
                }else{
                    Alerts.Error.display({
                        title   : 'Error Sending Request', 
                        content : 'There was a problem sending the request to the server.'
                    });
                }
            });
        },
        // activate or deactivate the user
        activateAccount: function(e){
            var me = this;
            var state = $(e.currentTarget).attr('did') == 'activate-account' ? 'true' : 'false';
            var text = state == 'true' ? 'Activated' : 'Deactivated';
            me.showLoading($(e.currentTarget));
            me.options.mc.update('accounts', utils.magnetId(me.entity.attributes.accounts[0]['magnet-uri']), {
                magnetActive : state
            }, function(){
                me.hideLoading($(e.currentTarget));
                me.$el.find('.btn.btn-primary').show();
                $(e.currentTarget).hide();
                $('#account-activation-state').html(text);
                Alerts.General.display({
                    title   : 'User '+text+' Successfully', 
                    content : 'The user has been '+text.toLowerCase()+' successfully.'
                });
            }, null, 'text/plain', function(xhr, status, error){
                me.hideLoading($(e.currentTarget));
                var res = xhr.responseText;
                if(res && res.message){
                    Alerts.Error.display({
                        title   : 'Error Sending Request', 
                        content : res.message
                    });
                }else{
                    Alerts.Error.display({
                        title   : 'Error Sending Request', 
                        content : 'There was a problem sending the request to the server.'
                    });
                }
            });
        },
        showLoading: function(dom){
            var parent = dom.closest('.buttons');
            parent.find('.buttons-section').hide();
            parent.find('.buttons-section.loading').show();
        },
        hideLoading: function(dom){
            var parent = dom.closest('.buttons');
            parent.find('.buttons-section').show();
            parent.find('.buttons-section.loading').hide();
        }
    });
    return View;
});