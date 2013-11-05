define(['jquery', 'backbone', 'models/UserModel', 'collections/ProjectCollection', 'collections/UserCollection'], function($, Backbone, UserModel, ProjectCollection, UserCollection){
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
            'click button[did="approve-user"]': 'approveUser',
            'click button[did="deny-user"]': 'approveUser',
            'click button[did="edit-user"]': 'editUser',
            'click button[did="edit-user-cancel"]': 'editUserCancel',
            'click button[did="edit-user-save"]': 'editUserSave',
            'click button[did="activate-user"]': 'activateUser',
            'click button[did="deactivate-user"]': 'activateUser',
            'click button[did="resend-registration=email"]': 'resendCompleteRegistrationEmail'
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
                    me.fetchCloudAccounts();
                    me.fetchInvitedUsers();
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
                        UserId : me.entity.attributes.id
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
        // fetch a collection of cloud accounts from the server
        fetchCloudAccounts: function(){
            var me = this;
            me.cloudAccounts = new UserCollection();
            me.cloudAccounts.fetch({
                data : {
                    relationship : {
                        name     : 'cloudAccounts',
                        magnetId : me.entity.attributes.magnetId
                    }
                },
                success: function(){
                    me.renderCloudAccounts();
                },
                error: function(){}
            });
        },
        renderCloudAccounts: function(){
            this.$el.find('#cloudaccount-list-container').html(_.template($('#CloudAccountListView').html(), {
                col : this.cloudAccounts.models
            }));
        },
        // fetch a collection of users invited by the current user from the server
        fetchInvitedUsers: function(){
            var me = this;
            me.invitedUsers = new UserCollection();
            me.invitedUsers.fetch({
                data : {
                    relationship : {
                        name     : 'invites',
                        magnetId : me.entity.attributes.magnetId
                    }
                },
                success: function(){
                    me.renderInvitedUsers();
                },
                error: function(){}
            });
        },
        renderInvitedUsers: function(){
            this.$el.find('#invitedusers-list-container').html(_.template($('#InvitedUsersListView').html(), {
                col : this.invitedUsers.models
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
            var state = $(e.currentTarget).attr('did') == 'approve-user' ? 'true' : 'false';
            var text = state == 'true' ? 'Approved' : 'Denied';
            me.showLoading($(e.currentTarget));
            me.options.mc.query('users/'+me.entity.attributes.magnetId+'/approve', 'PUT', null, function(){
                me.hideLoading($(e.currentTarget));
                me.$el.find('button[did="approve-user"]').hide();
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
        activateUser: function(e){
            var me = this;
            var state = $(e.currentTarget).attr('did') == 'activate-user';
            var text = state === true ? 'Activated' : 'Deactivated';
            me.showLoading($(e.currentTarget));
            me.options.mc.query('users/'+me.entity.attributes.magnetId+'/activated', 'PUT', {
                activated : state
            }, function(){
                me.hideLoading($(e.currentTarget));
                $(e.currentTarget).addClass('hidden');
                me.$el.find('button[did="'+(state == true ? 'deactivate-user' : 'activate-user')+'"]').removeClass('hidden');
                Alerts.General.display({
                    title   : 'User '+text+' Successfully',
                    content : 'The user has been '+text.toLowerCase()+' successfully.'
                });
            }, null, 'application/json', function(xhr, status, error){
                me.hideLoading($(e.currentTarget));
                Alerts.Error.display({
                    title   : 'Error Sending Request',
                    content : 'There was a problem sending the request to the server: '+xhr.responseText
                });
            });
        },
        // resend Complete Registration Email
        resendCompleteRegistrationEmail: function(e){
            var me = this;
            me.showLoading($(e.currentTarget));
            me.options.mc.query('users/'+me.entity.attributes.magnetId+'/sendCompleteRegistrationEmail', 'POST', null, function(){
                me.hideLoading($(e.currentTarget));
                Alerts.General.display({
                    title   : 'Registration Email Sent',
                    content : 'The user has been sent a Complete Registration email.'
                });
            }, null, 'application/json', function(xhr, status, error){
                me.hideLoading($(e.currentTarget));
                Alerts.Error.display({
                    title   : 'Error Sending Request',
                    content : 'There was a problem sending the request to the server: '+xhr.responseText
                });
            });
        },
        editUser: function(){
            this.$el.find('.buttons-section, .user-edit-value').hide();
            this.$el.find('.buttons-section-edit, .user-edit-input').show();
        },
        editUserCancel: function(e){
            this.$el.find('.buttons-section-edit, .user-edit-input').hide();
            this.$el.find('.user-edit-value').show();
            this.hideLoading($(e.currentTarget));
        },
        // save edits for a user
        editUserSave: function(e){
            var me = this;
            me.$el.find('.buttons-section-edit').hide();
            me.showLoading($(e.currentTarget));
            var properties = utils.collect(me.$el.find('#user-data-container'));
            var user = new UserModel({
                id       : this.entity.attributes.id,
                magnetId : this.entity.attributes.magnetId
            });
            for(var prop in properties.config){
                if((properties.config[prop] == '' && me.entity.attributes[prop] == null) || properties.config[prop] == me.entity.attributes[prop]){
                    delete properties.config[prop];
                }
            }
            if(!$.isEmptyObject(properties.config)){
                user.save(properties.config, {
                    success: function(){
                        me.hideLoading($(e.currentTarget));
                        me.entity.set(properties.config);
                        me.render('User');
                        me.fetchProjects();
                        me.fetchCloudAccounts();
                        me.fetchInvitedUsers();
                    },
                    error: function(){
                        Alerts.Error.display({
                            title   : 'Error Updating User',
                            content : 'There was a problem updating this user. Please try again later.'
                        });
                    }
                });
            }else{
                me.$el.find('.buttons-section-edit, .user-edit-input').hide();
                me.$el.find('.user-edit-value').show();
                me.hideLoading($(e.currentTarget));
            }
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