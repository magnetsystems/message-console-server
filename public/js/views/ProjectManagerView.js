define(['jquery', 'backbone', 'views/UploadView', 'models/ProjectModel', 'models/ProjectVersionModel'], function($, Backbone, UploadView, ProjectModel, ProjectVersionModel){
    var View = Backbone.View.extend({
        el: '#project-manager',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initProjectManager', function(params){
                me.projects = params.projects;
                me.activeInstance = params.activeInstance;
                me.deployedApplicationStatus = params.status;
                me.wWidth = me.$el.find('#project-list').width();
                me.$el.find('#project-list-head').width(me.wWidth);
                me.$el.find('#project-list').css('margin-top', me.$el.find('#project-list-head').height()+'px');
                $('#pm-projects').html('');
                var currentPane = $('.v-pane').not('.hidden').attr('id').replace('pm-', '');
                me.selectPane(false, currentPane);
            });
            me.bindResize();
            // create web component for wsdl upload
            var uploader = new UploadView({
                el          : '#upload-server-jar-input',
                context     : 'ServerJar',
                method      : 'PUT',
                buttonName  : 'Select a Server Binary',
                validation  : {
                    allowedExtensions : ['zip']
                },
                eventPubSub : me.options.eventPubSub
            });
            // bind server binary upload button since it is not part of this view
            $('#upload-server-jar-btn').unbind('click').click(function(){
                me.uploadJarAction();
            });
            // upon successful upload of a server binary, display alert
            me.options.eventPubSub.bind('uploadServerJarComplete', function(params){
                params.params.parent.find('.qq-upload-list li').remove();
                if(params.xhr.status == 200 || params.xhr.status == 201 || params.xhr.status == 'unknown'){
                    $('#upload-server-jar').modal('hide');
                    var project = me.projects.where({
                        magnetId : params.params.pid
                    })[0];
                    project.set({
                        'project-versions' : [params.params.model]
                    });
                    me.render('projects');
                    Alerts.General.display({
                        title   : 'Server Binary Uploaded',
                        content : 'You have successfully uploaded a new server binary for this project.'
                    });
                }else{
                    me.uploadJarError(params.params.parent);
                }
                me.options.eventPubSub.trigger('btnComplete', $('#upload-server-jar-btn'));
            });
        },
        events: {
            'click #pm-create-project' : 'createProject',
            'click .pm-edit' : 'editProject',
            'click .pm-delete' : 'deleteProject',
            //'click .pm-clone' : 'cloneProject',
            'click .pm-uploadjar' : 'uploadJar',
            'click .pm-assets' : 'gotoAssets',
            'click #project-list .manager-row' : 'selectRow',
            'click .v-pane-trigger' : 'selectPane',
            //'click #pm-add-user' : 'addUser',
            //'click #pm-invite-user-btn' : 'inviteUser',
            //'click #pm-add-user-row .pm-remove-add-user' : 'removeAddUserRow',
            //'click .pm-delete-member' : 'deleteUser',
            //'keypress #pm-add-user-email': 'inviteUserKeypress',
            'click .pm-serverjar-delete': 'deleteServerJar',
            'click .pm-serverjar-generate': 'generateServerJar',
            'click .pm-serverjar-assets' : 'gotoVersionAssets'
        },
        // when browser is resized, obtain new table width and apply to affixed table header for alignment
        bindResize: function(){
            var me = this;
            $(window).resize(function(){
                me.wWidth = me.$el.find('#project-list').width();
                me.$el.find('#project-list-head').width(me.wWidth);
                me.$el.find('#project-list').css('margin-top', me.$el.find('#project-list-head').height()+'px');
            });
        },
        // event to transition pane into another pane after a page trigger is executed
        selectPane: function(e, viewId){
            var me = this;
            viewId = viewId || $(e.currentTarget).attr('did'); 
            var domId = 'pm-'+viewId;
            me.renderPane(viewId);
            var curr = $('.v-pane').not('.hidden');
            if(curr.attr('id') == domId){
                return false;
            }
            $.each(me.transitions, function(id, pane){
                if(id == curr.attr('id')){
                    $.each(pane, function(i, transition){
                        if(domId == transition.to){
                            //me.removeAddUserRow();
                            me.slideTransition({
                                from  : curr,
                                to    : $('#'+domId),
                                slide : transition.slide,
                                end   : transition.end
                            });
                        }
                    });
                }
            });
        },
        // fetch data from server and render the new pane
        renderPane: function(viewId){
            var me = this;
            switch(viewId){
                case 'log' :
                    me.render(viewId);
                    me.options.eventPubSub.trigger('initListView', {
                        el              : '#pm-log-list',
                        col             : me.projects,
                        headers         : {
                            primaryEmailAddress : 'Email Address',
                            name                : 'Name'
                        },
                        searchBy        : 'name',
                        disableInfo     : true
                    });
                    break;
                case 'users' :
                    /*
                    me.getUsers(magnetId, function(){
                        me.render(magnetId, viewId);
                    });
                    */
                    break;
                default :
                    me.render(viewId);
                    /*
                    me.getProjects(function(){
                        me.render(viewId);
                    });
                    */
                    break;
            }
        },
        // slide pane up or down depending on the source pane and destination pane
        slideTransition: function(params){
            var me = this;
            var anim = {
                top : params.slide == 'up' ? '-' + params.from.height() + 'px' : params.from.height() + 'px'
            };
            if(!params.end){
                me.$el.removeClass('end');
            }
            params.from.animate(anim, 500, function(){
                params.from.addClass('hidden');
            });
            params.to.removeClass('hidden');
            params.to.css('top', params.slide == 'up' ? params.from.height() + 'px' : '-' + params.from.height() + 'px');
            var anim2 = {
                top : '0px'
            };
            params.to.animate(anim2, 500, function(){
                if(params.end){
                    me.$el.addClass('end');
                }
                me.wWidth = me.$el.find('#project-list').width();
                me.$el.find('#project-list-head').width(me.wWidth);
                me.$el.find('#project-list').css('margin-top', me.$el.find('#project-list-head').height()+'px');
            });
        },
        // a map of pane transitions
        transitions: {
            'pm-projects' : [
                {to : 'pm-log', slide : 'up'}, 
                {to : 'pm-users', slide : 'up', end : true}
            ],
            'pm-log' : [
                {to : 'pm-projects', slide : 'down'}, 
                {to : 'pm-users', slide : 'up', end : true}
            ],
            'pm-users' : [
                {to : 'pm-projects', slide : 'down'},
                {to : 'pm-log', slide : 'down'}
            ]
        },
        /*
        // fetch collection of projects associated with the current workspace
        getProjects: function(callback){
            var me = this;
            me.projects = new ProjectCollection();
            me.projects.fetch({
                data : {
                    relationship : {
                        name   : 'olsprojects',
                        magnetId : magnetId
                    },
                    pageSize  : 30,
                    sorts     : {lastModifiedTime : 'desc'}
                },
                success: function(){
                    callback();
                }, 
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Retrieving Projects', 
                        content : 'There was a problem retrieving your projects. Please try again later.'
                    });
                }
            });
        },
        // fetch collection of users associated with the current workspace
        getUsers: function(magnetId, callback){
            var me = this;
            me.projects = new WorkspaceMemberCollection();
            me.projects.fetch({
                data : {
                    magnetId : 'workspaces:'+magnetId
                },
                success: function(){
                    callback();
                }, 
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Retrieving Users', 
                        content : 'There was a problem retrieving your users. Please try again later.'
                    });
                }
            });
        },
        */
        // render list of projects as a table with headers fixed at top of page when page is scrolled
        render: function(view){
            var template = _.template($('#PM'+view+'View').html(), {
                projects                  : this.projects,
                activeInstance            : this.activeInstance,
                deployedApplicationStatus : this.deployedApplicationStatus
            });
            $('#pm-'+view).html(template);
            this.$el.find('#project-list').css('margin-top', this.$el.find('#project-list-head').height()+'px');
            // positions viewable area of screen to currently selected row
            this.selected ? this.selectRow(null, this.selected) : '';
            return this;
        },
        // create a new project
        createProject: function(){
            this.selected = false;
            Backbone.history.navigate('#/project-wizard/new');
        },
        // navigate to the project wizard 
        editProject: function(e){
            var me = this;
            var pid = $(e.currentTarget).closest('.row-container').attr('did');
            Backbone.history.navigate('#/project-wizard/'+pid);
        },
        // delete the selected project
        deleteProject: function(e){
            var me = this;
            var parent = $(e.currentTarget).closest('.row-container');
            var pid = parent.attr('did');
            Alerts.Confirm.display({
                title   : 'Confirm Project Deletion', 
                content : 'Are you sure you wish to delete this project? Please note that once your project has been deleted, it cannot be recovered.'
            }, function(){
                var proj = new ProjectModel({
                    magnetId : pid,
                    id       : pid.slice(pid.lastIndexOf(':')+1)
                });
                proj.destroy({
                    success: function(){
                        me.projects.remove({
                            magnetId : pid
                        });
                        parent.hide('slow', function(){
                            me.selected = false;
                            $(this).remove();
                        });
                        Alerts.General.display({
                            title   : 'Project Deleted', 
                            content : 'Your project has been deleted successfully.'
                        });
                    },
                    error: function(){
                        Alerts.General.display({
                            title   : 'Error Deleting Project', 
                            content : 'There was an error deleting the project. Please try again later.'
                        });
                    }
                });
            });
        },
        /*
        // create an exact clone of a project with all settings and selections identical. name is appended with (cloned)
        cloneProject: function(e){
            var me = this;
            var parent = $(e.currentTarget).closest('.row-container');
            var pid = parent.attr('did');
            alert('This does not work yet. Showing clone UI: ');
            parent.clone().attr('did', 'cloned').prependTo(me.$el.find('#project-list'));
            me.selectRow(null, pid);
            var newDiv = me.$el.find('#project-list .row-container[did="cloned"] .manager-row div:nth-child(2)');
            newDiv.html('(clone) '+newDiv.html());
        },
        */
        // display dialog used to upload a server binary
        uploadJar: function(e){
            var me = this;
            var parent = $(e.currentTarget).closest('.row-container');
            var pid = parent.attr('did');
            var project = me.projects.where({
                magnetId : pid
            });
            if(project[0]){
                var display = $('#upload-server-jar');
                display.find('.modal_errors').hide();
                display.find('input').val('');
                display.find('#server-binary-name').html(project[0].attributes.name);
                display.find('#server-binary-version').html(project[0].attributes.version);
                display.modal('show');
            }
        },
        // event when upload server binary button is pressed. Creates project-versions entity, content entity relationship, and PUTs the server binary into the content entity
        uploadJarAction: function(){
            var me = this;
            var parent = $('#upload-server-jar');
            parent.find('.modal_errors').hide();
            var btn = $('#upload-server-jar-btn');
            $('.qq-upload-cancel').hide();
            if(!btn.hasClass('disabled') && parent.find('.qq-upload-list li').length){
                me.options.eventPubSub.trigger('btnLoading', btn);
                var filename = parent.find('.qq-upload-file').text();
                var pid = me.$el.find('.manager-row.active').closest('.row-container').attr('did');
                var desc = parent.find('input[name="description"]').val();
                desc = $.trim(desc).length > 0 ? desc.replace('~', '-') : '';
                me.options.mc.create('projects/'+pid+'/project-versions', {
                    description : filename+' ~ '+desc
                }, function(data, status, xhr){
                    var versionId = utils.magnetId(xhr['Location']);
                    me.options.mc.create('project-versions/'+versionId+'/contents', {
                        name        : filename,
                        description : 'server sandbox zip'
                    }, function(data, status, xhr){
                        var contentId = utils.magnetId(xhr['Location']);
                        me.options.eventPubSub.trigger('uploadServerJar', '/rest/contents/'+contentId+'/data', {
                            parent   : parent,
                            model    : {
                                magnetId      : versionId,
                                description : filename+' ~ '+desc
                            },
                            pid      : pid,
                            filename : filename
                        });
                        parent.find('input').val('');
                    }, function(){
                        me.options.eventPubSub.trigger('btnComplete', btn);
                        me.uploadJarError(parent);
                    });
                }, function(){
                    me.options.eventPubSub.trigger('btnComplete', btn);
                    me.uploadJarError(parent);
                });
            }else{
                parent.find('.modal_errors strong').text('No File Selected: ');
                parent.find('.modal_errors span').text('No file has been selected.');
                parent.find('.modal_errors').hide().slideDown('fast');
                me.options.eventPubSub.trigger('btnComplete', btn);
            }
        },
        // display an error on an unsuccessful upload of a jar
        uploadJarError: function(modal){
            modal.find('.modal_errors strong').text('Error Uploading File: ');
            modal.find('.modal_errors span').text('There was an error uploading the file.');
            modal.find('.modal_errors').hide().slideDown('fast');
        },
        // delete server binary entity on the server
        deleteServerJar: function(e){
            var parent = $(e.currentTarget).closest('.row-container');
            var pid = parent.attr('did');
            var project = this.projects.where({
                magnetId : pid
            })[0];
            var versions = project.get('project-versions');
            var version = new ProjectVersionModel({
                magnetId : versions[0].magnetId,
                id     : versions[0].magnetId.slice(versions[0].magnetId.lastIndexOf(':')+1)
            });
            version.destroy();
            project.set({
                'project-versions' : []
            });
            this.render('projects');
        },
        // generate assets for a server binary
        generateServerJar: function(e){
            var parent = $(e.currentTarget).closest('.well');
            var pid = parent.attr('did');
            this.options.mc.query('project-versions/'+pid+'/assets?forceToGenerate=true', 'GET', null, function(){
                Backbone.history.navigate('#/project-version-assets/'+pid);
                Alerts.General.display({
                    title   : 'Generating Assets From Server Binary',
                    content : 'Your project is now generating assets. Assets for this project version may take several minutes to generate.'
                });
            });
        },
        // navigate to the assets page of a project
        gotoAssets: function(e){
            var pid = $(e.currentTarget).closest('.row-container').attr('did');
            Backbone.history.navigate('#/project-assets/'+pid);
        },
        // navigate to the assets page of a project version
        gotoVersionAssets: function(e){
            var pid = $(e.currentTarget).closest('.well').attr('did');
            Backbone.history.navigate('#/project-version-assets/'+pid);
        },
        // perform actions when a row has been selected
        selectRow: function(e, pid){
            var me = this;
            var parent = (pid ? me.$el.find('#project-list .row-container[did="'+pid+'"]') : $(e.currentTarget).closest('.row-container'));
            var row = parent.find('.manager-row');
            var rowInfo = parent.find('.info-row-wrapper');
            if(!row.hasClass('active') && row.attr('did') != 'cloned'){
                me.$el.find('#project-list .manager-row').removeClass('active');
                me.$el.find('#project-list .info-row-wrapper').slideUp('fast');
                row.addClass('active');
                rowInfo.slideDown('fast', function(){
                    $('#project-list').scrollTo(me.$el.find('#project-list .row-container[did="'+parent.attr('did')+'"]'), 500, {
                        onAfter: function(){
                            var settings = $('#project-list-head').hasClass('affix') ? {offset : {top: -43}} : {};
                            $('#project-list').scrollTo(me.$el.find('#project-list .row-container[did="'+parent.attr('did')+'"]'), 100, settings);
                        }
                    });
                });
                me.selected = parent.attr('did');
            }else{
                row.removeClass('active');
                rowInfo.slideUp('fast');
                me.selected = false;
            }
        }
        /*
        // sort list of projects by name
        sortList: function(isASC){
            var sel = this.$el.find('#project-list');
            var list = sel.children('.row-container').sort(function(a, b){
                var uA = $(a).find('div.span3:nth-child(2)').text();
                var uB = $(b).find('div.span3:nth-child(2)').text();
                if(isASC){
                    return (uA < uB) ? -1 : (uA > uB) ? 1 : 0;
                }else{
                    return (uA > uB) ? -1 : (uA < uB) ? 1 : 0;
                }
            });
            sel.html(list);
        },
        // display add user row
        addUser: function(){
            this.$el.find('#pm-add-user-row').removeClass('hidden').css('background-color', '#DEEFFC').animate({
                'background-color' : '#F7F7F7' 
            }, 500, function(){
                $(this).find('input').focus();
            });
        },
        // remove add user row
        removeAddUserRow: function(){
            this.$el.find('#pm-add-user-row').addClass('hidden');
        },
        // invite user to the workspace
        inviteUser: function(){
            var input = $('#pm-add-user-email');
            var me = this;
            var parent = input.closest('tr');
            parent.find('.buttons-section').hide();
            parent.find('.buttons-section.loading').show();
            me.options.eventPubSub.trigger('getUserIdentity', function(user){
                me.options.mc.query('workspaces/'+me.workspace.attributes.magnetId+'/inviteMember?email='+input.val(), 'POST', null, function(){
                    parent.find('.buttons-section').show();
                    parent.find('.buttons-section.loading').hide();
                    me.selectPane(null, 'users');
                    Alerts.General.display({
                        title   : 'Invitation Sent Successfully', 
                        content : 'Your invitation email to '+input.val()+' has been sent successfully.'
                    });
                    input.val('');
                }, null, 'application/x-www-form-urlencoded', function(xhr, status, error){
                    parent.find('.buttons-section').show();
                    parent.find('.buttons-section.loading').hide();
                    var res = xhr.responseText;
                    if(res && res.message){
                        Alerts.Error.display({
                            title   : 'Invitation Not Sent', 
                            content : res.message
                        });
                    }else{
                        Alerts.Error.display({
                            title   : 'Invitation Not Sent', 
                            content : 'There was a problem sending the invitation.'
                        });
                    }
                });
            });
        },
        // bind return key to user invitation
        inviteUserKeypress: function(e){
            if(e.keyCode != 13){
                return;
            }else{
                this.inviteUser();
            }
        },
        // remove a member from the workspace
        deleteUser: function(e){
            var me = this;
            var dom = $(e.currentTarget).closest('tr');
            var magnetId = dom.attr('did');
            var member = me.projects.where({
                magnetId : magnetId
            })[0];
            me.projects.remove(member);
            var member = new MemberModel({
                magnetId : magnetId,
                id     : magnetId.slice(magnetId.lastIndexOf(':')+1)
            });
            member.destroy({
                success : function(){
                    Alerts.General.display({
                        title   : 'Member Deleted Successfully', 
                        content : 'The member has been deleted from the workspace successfully.'
                    });
                    me.render(me.workspace.attributes.magnetId, 'users');
                },
                error : function(){
                    Alerts.Error.display({
                        title   : 'Error Deleting Member', 
                        content : 'There was a problem deleting the member from the workspace.'
                    });
                }
            });
        }
        */
    });
    return View;
});