define(['jquery', 'backbone', 'models/UserModel', 'models/ProjectModel', 'models/HistoryModel', 'models/RegistrationTaskModel'], function($, Backbone, UserModel, ProjectModel, HistoryModel, RegistrationTaskModel){
    var View = Backbone.View.extend({
        el: "#admin-details",
        initialize: function(){
            var me = this;
            // initialize the view
            me.options.eventPubSub.bind('initAdminDetailsView', function(params){
                me.page = params.page;
                me.$el.find('.page-view').html('<img src="/images/ajax-loader.gif" style="padding:8px">');
                switch(me.page){
                    case 'users':
                        me.fetchUser(params);
                        break;
                    case 'invites':
                        me.fetchContact(params);
                        break;
                    case 'requests':
                        me.fetchContact(params);
                        break;
                    case 'history':
                        me.fetchLog(params);
                        break;
                }
            });
        },
        events: {
            'click button[did="delete-user"]': 'deleteUser',
            'click button[did="activate-account"]': 'activateAccount',
            'click button[did="deactivate-account"]': 'activateAccount',
            'click button[did="delete-contact"]': 'deleteContact',
            'click button[did="approve-contact"]': 'approveContact',
            'click button[did="deny-contact"]': 'approveContact'
        },
        // fetch a registration task entity with several relationships to display information about the user
        fetchContact: function(params){
            var me = this;
            me.entity = new RegistrationTaskModel({
                magnetId : params.magnetId,
                id       : params.magnetId.slice(params.magnetId.lastIndexOf(':')+1)
            });
            me.entity.fetch({
                data : {
                    relations : ['userInfo', 'tasks']
                },
                success: function(){
                    if(me.entity.attributes.invitor){
                        me.getInviter();
                    }else{
                        me.render('Contact');
                    }
                }, 
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Retrieving User', 
                        content : 'There was a problem retrieving this user. Please try again later.'
                    });
                }
            });
        },
        // get the details of the user who invited this user
        getInviter: function(){
            var me = this;
            var user = new UserModel({
                magnetId : utils.magnetId(me.entity.attributes.invitor)
            });
            user.fetch({
                data : {
                    relationship : {
                        name     : 'profile',
                        magnetId : utils.magnetId(me.entity.attributes.invitor)
                    }
                },
                success: function(){
                    me.entity.set({
                        invitedBy : user.attributes
                    });
                    me.render('Contact');
                }
            });
        },
        // fetch a user entity object from server
        fetchUser: function(params){
            var me = this;
            me.entity = new UserModel({
                magnetId : params.magnetId,
                id       : params.magnetId.slice(params.magnetId.lastIndexOf(':')+1)
            });
            me.entity.fetch({
                data : {
                    relations : ['*']
                },
                success: function(){
                    me.render('User');
                }, 
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Retrieving Log',
                        content : 'There was a problem retrieving this log. Please try again later.'
                    });
                }
            });
        },
        // fetch a log-event-record entity object from server
        fetchLog: function(params){
            var me = this;
            me.entity = new HistoryModel({
                magnetId : params.magnetId,
                id       : params.magnetId.slice(params.magnetId.lastIndexOf(':')+1)
            });
            me.entity.fetch({
                data : {
                    relations : ['*']
                },
                success: function(){
                    me.render('Log');
                    me.getProjectDetails();
                },
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Retrieving User',
                        content : 'There was a problem retrieving this user. Please try again later.'
                    });
                }
            });
        },
        getProjectDetails: function(){
            var me = this;
            if(me.entity.attributes.context && me.entity.attributes.context['magnet-uri'].indexOf('projects/') != -1){
                me.renderProjectDetails(me.entity.attributes.context);
            }else if(me.entity.attributes.object){
                console.log('project context not found, retrieving project from cloudcompute-instance entity relationship.');
                me.options.mc.query('cloudcompute-instances/'+utils.magnetId(me.entity.attributes.object['magnet-uri'])+'/project', 'GET', {}, function(project){
                    project.magnetId = utils.magnetId(project['magnet-uri']);
                    me.renderProjectDetails(project);
                });
            }else{
                $('#log-project-details-container').html('No Context Available.');
            }
        },
        renderProjectDetails: function(model){
            this.$el.find('#log-project-details-container').html(_.template($('#AdminLogProjectDetailsView').html(), {
                model : model
            }));
            var magnetId = utils.magnetId(model['magnet-uri']);
            this.getProjectSettings(magnetId);
            this.getProjectAssets(magnetId);
        },
        getProjectSettings: function(magnetId){
            var me = this;
            me.options.mc.query('projects/'+magnetId+'/projectSetting', 'GET', {}, function(projectSetting){
                projectSetting.magnetId = utils.magnetId(projectSetting['magnet-uri']);
                me.renderProjectSettings(projectSetting);
            });
        },
        renderProjectSettings: function(projectSetting){
            this.$el.find('#log-project-settings-container').html(_.template($('#AdminLogProjectDetailsView').html(), {
                model : projectSetting
            }));
        },
        getProjectAssets: function(magnetId){
            var me = this;
            me.options.mc.query('projects/'+magnetId+'/contents?_magnet_select=*', 'GET', {}, function(projectAssets){
                me.renderProjectAssets(projectAssets);
            });
        },
        renderProjectAssets: function(projectAssets){
            this.$el.find('#log-project-assets-container').html(_.template($('#AdminLogProjectAssetsView').html(), {
                col : projectAssets.page
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
        // delete the current contact
        deleteContact: function(){
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
        approveContact: function(e){
            var me = this;
            var state = $(e.currentTarget).attr('did') == 'approve-contact' ? 'true' : 'false';
            var text = state == 'true' ? 'Approved' : 'Denied';
            var approvalTask = false;
            me.showLoading($(e.currentTarget));
            for(var i=me.entity.attributes.tasks.length;i--;){
                if(me.entity.attributes.tasks[i].magnetId.indexOf('approval-task') != -1){
                    approvalTask = me.entity.attributes.tasks[i];
                }
            }
            if(!approvalTask){
                Alerts.Error.display({
                    title   : 'Error Sending Request',
                    content : 'There was a problem sending the request to the server.'
                });
                return false;
            }
            me.options.mc.query('approval-tasks/'+approvalTask.magnetId+'/doApproval?approved='+state, 'POST', null, function(){
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