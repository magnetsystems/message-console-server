define(['jquery', 'backbone', 'models/UserModel', 'collections/UserCollection', 'models/AppModel', 'collections/AppCollection'], function($, Backbone, UserModel, UserCollection, AppModel, AppCollection){
    var View = Backbone.View.extend({
        el: "#mgmt-user-details",
        initialize: function(options){
            var me = this;
            me.options = options;
            // initialize the view
            me.options.eventPubSub.bind('initAdminDetailsView', function(params){
                me.page = params.page;
                me.$el.find('.page-view').html('<img src="/images/ajax-loader.gif" style="padding:8px">');
                me.mmxCol = new AppCollection();
                me.fetchUser(params);
                me.$el.closest('.tab-content').find('.tab-pane.active').removeClass('active');
                $('#mgmt-user-details').addClass('active');
            });
        },
        events: {
            'click button[did="approve-user"]': 'approveUser',
            'click button[did="deny-user"]': 'approveUser',
            'click #mgmt-user-delete-btn': 'deleteUser',
            'click #mgmt-user-edit-btn': 'startEdit',
            'click #mgmt-user-cancel-btn': 'cancelEdit',
            'click #mgmt-user-save-btn': 'editUserSave',
            'click button[did="activate-user"]': 'activateUser',
            'click button[did="deactivate-user"]': 'activateUser',
            'click button[did="resend-registration=email"]': 'resendCompleteRegistrationEmail',
//            'click .panel-body button': 'performAction',
            'click #mgmt-mmxapp-delete-btn': 'deleteMMXApp',
            'click .panel .mmx-edit': 'editName',
            'click .panel .mmx-saveedit': 'saveEditName',
            'click .panel .mmx-canceledit': 'cancelEditName',
            'click #user-reset-password-btn': 'resetPassword'
        },
        fetchUser: function(params){
            var me = this;
            me.entity = new UserModel({
                magnetId : params.magnetId,
                id       : params.magnetId.slice(params.magnetId.lastIndexOf(':')+1)
            });
            me.entity.fetch({
                success: function(){
                    me.render('User');
                    me.fetchInvitedUsers();
                    me.fetchMMXApps();
                }, 
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Retrieving User',
                        content : 'There was a problem retrieving this user. Please try again later.'
                    });
                }
            });
        },
        fetchMMXApps: function(){
            var me = this;
            var col = new UserCollection();
            col.fetch({
                data : {
                    relationship : {
                        name     : 'apps',
                        magnetId : me.entity.attributes.magnetId
                    }
                },
                success: function(col){
                    me.mmxCol = new AppCollection();
                    for(var i=0;i<col.models.length;++i){
                        me.mmxCol.add(col.models[i].attributes);
                    }
                    me.renderMMXApps();
                },
                error: function(){}
            });
        },
        renderMMXApps: function(){
            this.$el.find('#mmxapp-list-container').html(_.template($('#MMXAppListView').html(), {
                col : this.mmxCol.models
            }));
        },
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
            this.$el.find('#mgmt-user-user-details').html(template);
            return this;
        },
        deleteUser: function(){
            var me = this;
            Alerts.Confirm.display({
                title   : 'Delete Account',
                content : 'Are you sure you wish to delete this account? Please note that once this account has been deleted, it cannot be recovered.'
            }, function(){
                me.entity.destroy({
                    success: function(){
                        Backbone.history.navigate('#/'+me.page);
                        Alerts.General.display({
                            title   : 'Account Deleted',
                            content : 'The selected account has been deleted successfully. Returning to administration page.'
                        });
                    },
                    error: function(e, xhr){
                        var msg = 'There was an error deleting the selected account.';
                        if(xhr.responseText == 'validation-error') msg = 'The account you are attempting to delete is' +
                            ' the only active admin. If you delete this account, you will not be able to log in.';
                        Alerts.Error.display({
                            title   : 'Error Deleting Account',
                            content : msg
                        });
                    }
                });
            });
        },
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
        startEdit: function(e){
            var btn = $(e.currentTarget);
            if(btn.hasClass('disabled')) return;
            var userPanel = this.$el.find('#user-panel');
            userPanel.find('input, select').prop('disabled', false);
            userPanel.find('.btn-toggle button').removeClass('disabled');
            userPanel.find('.panel-heading div[did="readonly"] .disableable').addClass('disabled');
            userPanel.find('.panel-heading div[did="readwrite"] .disableable').removeClass('disabled');
        },
        cancelEdit: function(){
            this.render('User');
        },
        endEdit: function(e, dom){
            var btn = dom || $(e.currentTarget);
            if(btn.hasClass('disabled')) return;
            var userPanel = this.$el.find('#user-panel');
            userPanel.find('input, select').prop('disabled', true);
            userPanel.find('.btn-toggle button').addClass('disabled');
            this.hideLoading(btn);
            userPanel.find('.panel-heading div[did="readonly"] .disableable').removeClass('disabled');
            userPanel.find('.panel-heading div[did="readwrite"] .disableable').addClass('disabled');
        },
        editUserSave: function(e){
            var me = this;
            var btn = $(e.currentTarget);
            me.$el.find('.buttons-section-edit').hide();
            me.showLoading(btn);
            var properties = utils.collect(me.$el.find('#user-panel'));
            var user = new UserModel({
                id       : this.entity.attributes.id,
                magnetId : this.entity.attributes.magnetId
            });
            for(var prop in properties){
                if((properties[prop] === '' && me.entity.attributes[prop] === null) || properties[prop] === me.entity.attributes[prop]){
                    delete properties[prop];
                }
            }
            if(!$.isEmptyObject(properties)){
                user.save(properties, {
                    success: function(){
                        me.endEdit(null , btn);
                        me.entity.set(properties);
                        me.render('User');
                        me.fetchInvitedUsers();
                    },
                    error: function(e, xhr){
                        me.hideLoading(btn);
                        var msg = 'There was an error updating the selected account.';
                        if(xhr.responseText == 'validation-error') msg = 'The account you are attempting to update is' +
                            ' the only active admin. If you block this account or change the user type to "developer", you will not be able to log in.';
                        Alerts.Error.display({
                            title   : 'Error Updating Account',
                            content : msg
                        });
                    }
                });
            }else{
                me.endEdit(null , btn);
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
        },
        editName: function(e){
            var me = this;
            var item = $(e.currentTarget).closest('.panel');
            var did = item.attr('did');
            var model = me.mmxCol.where({
                magnetId : did
            })[0];
            item.find('.panel-title').addClass('hidden');
            item.find('.panel-name').removeClass('hidden');
            item.find('.panel-name input').val(model.attributes.name);
            item.find('div[did="readonly"] .disableable').addClass('disabled');
            item.find('div[did="readwrite"] .disableable').removeClass('disabled');
        },
        cancelEditName: function(e){
            var item = $(e.currentTarget).closest('.panel');
            item.find('.panel-title').removeClass('hidden');
            item.find('.panel-name').addClass('hidden');
            item.find('div[did="readonly"] .disableable').removeClass('disabled');
            item.find('div[did="readwrite"] .disableable').addClass('disabled');
        },
        saveEditName: function(e){
            var me = this;
            var item = $(e.currentTarget).closest('.panel');
            var did = item.attr('did');
            var panelInput = item.find('.panel-name input');
            var panelTitle = item.find('.panel-title');
            var model = me.mmxCol.where({
                appId : did
            })[0];
            model.save({
                name : panelInput.val()
            }, {
                patch: true,
                success: function(){
                    panelTitle.text(panelInput.val());
                    panelTitle.removeClass('hidden');
                    panelInput.addClass('hidden');
                    me.renderMMXApps();
                },
                error: function(e){
                    console.log('error', e);
                }
            });
        },
        deleteMMXApp: function(e){
            var me = this;
            var item = $(e.currentTarget);
            var action = item.attr('did');
            var did = item.closest('.panel').attr('did');
            var model = me.mmxCol.where({
                magnetId : did
            })[0];
            model.set({id:model.attributes.magnetId});
            if(action === 'delete'){
                Alerts.Confirm.display({
                    title   : 'Confirm App Deletion',
                    content : 'Are you sure you wish to delete this app? Please note that once this app has been deleted, it cannot be recovered.'
                }, function(){
                    model.destroy({
                        success: function(){
                            me.renderMMXApps();
                        },
                        error: function(e){
                            console.log('error', e);
                        }
                    });
                });
            }
        },
        resetPassword: function(e){
            var me = this;
            var btn = $(e.currentTarget);
            Alerts.Confirm.display({
                title   : 'Confirm Password Reset',
                content : 'Are you sure you wish to reset this password? Please note that once this password has been reset, the original password cannot be recovered.'
            }, function(){
                me.showLoading(btn);
                me.options.mc.query('users/'+me.entity.attributes.magnetId+'/resetPassword', 'POST', null, function(res){
                    me.hideLoading(btn);
                    Alerts.General.display({
                        title   : 'Password Reset',
                        content : 'The user password has been reset. The new password is: <pre>'+res+'</pre>'
                    });
                }, null, 'application/json', function(xhr, status, error){
                    me.hideLoading(btn);
                    Alerts.Error.display({
                        title   : 'Error Resetting Password',
                        content : 'There was a problem resetting the user password: '+xhr.responseText
                    });
                });
            });
        }
    });
    return View;
});