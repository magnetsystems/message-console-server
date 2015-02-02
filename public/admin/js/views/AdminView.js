define(['jquery', 'backbone', 'collections/UserCollection', 'collections/EventCollection'], function($, Backbone, UserCollection, EventCollection){
    var View = Backbone.View.extend({
        el: "#admin",
        initialize: function(options){
            var me = this;
            me.options = options;
            me.options.eventPubSub.bind('initAdminView', function(page){
                page = page || 'users';
                me.loadTab(page);
                if(me.pages[page]){
                    me.col = new me.pages[page].col();
                    me.options.eventPubSub.trigger('initListView', {
                        el              : '#mgmt-'+page+'-list',
                        col             : me.col,
                        headers         : me.pages[page].headers,
                        searchBy        : me.pages[page].searchBy,
                        data            : me.pages[page].data,
                        sortDefault     : me.pages[page].sortDefault,
                        disableInfo     : me.pages[page].disableInfo,
                        disableControls : me.pages[page].disableControls
                    });
                }
                me.options.eventPubSub.off('displayInfoView').bind('displayInfoView', function(model){
                    Backbone.history.navigate('#/'+page+'/'+model.attributes.magnetId);
                });
                if(page == 'cms') me.getPageList();
                if(page == 'actions') me.getConfig();
                me.selectedPage = {};
                $('#cms-folder-span, #cms-filename-span').text('');
            });
        },
        // metadata for admin views
        pages: {
            'users' : {
                col      : UserCollection,
                headers  : {
                    createdAt : 'Created On',
                    email     : 'Email Address',
                    firstName : 'First Name',
                    lastName  : 'Last Name',
                    userType  : 'Type of User'
                },
                searchBy : 'name',
                sortDefault : {
                    property : 'createdAt',
                    order    : 'desc'
                }
            },
            'events' : {
                col      : EventCollection,
                headers  : {
                    createdAt : 'Created On',
                    message   : 'Message'
                },
                searchBy : 'message',
                disableInfo : true,
                sortDefault : {
                    property : 'createdAt',
                    order    : 'desc'
                }
            }
        },
        events: {
            'click #send-invitation': 'sendInvitation',
            'click #mgmt-history-list tbody td': 'showInfoPopup',
            'click .attachment-link' : 'showLog',
            'click .cmspage' : 'selectPage',
            'click .cms-button' : 'startCMSEdit',
            'click .cms-editing-button' : 'endCMSEdit',
            'click .admin-config-save-btn': 'saveConfig',
            'click div[did="shareDB"] button': 'onShareDBClick',
            'click #admin-user-create-btn': 'createUser'
        },
        // handle events for switching between tabs
        loadTab: function(id){
            this.$el.find('.nav-tabs li').each(function(){
                $(this).removeClass('active');
            });
            this.$el.find('.tab-pane.active').removeClass('active');
            $('#mgmt-'+id+'-tab, #mgmt-'+id).addClass('active');
            $('#'+id).scrollTo(0);
        },
        // get CMS pages
        getPageList: function(){
            var me = this;
            var parent = $('#cms-menu');
            $('#cms-content, #cms-actions').hide();
            $('#cms-editable-section').hide();
            me.resetButtons();
            me.showLoading(parent);
            me.options.mc.query('views', 'GET', {}, function(res){
                me.hideLoading(parent);
                me.cmsPages = res;
                parent.html(_.template($('#CMSListView').html(), {
                    col : res
                }));
            }, null, null, function(xhr, status, error){
                me.hideLoading(parent);
            });
            me.retrieveCMSPage(null, {
                folder   : 'layouts',
                filename : 'general'
            }, function(data){
                me.CMSLayout = data;
            });
        },
        resetButtons: function(){
            $('.cms-button').show();
            $('.cms-editing-button').hide();
        },
        retrieveCMSPage: function(parent, page, callback){
            var me = this;
            me.resetButtons();
            me.options.mc.query('getView', 'POST', {
                folder    : page.folder,
                filename  : page.filename,
                isPreview : parent ? false : true
            }, function(data){
                me.hideLoading(parent);
                callback(data);
            }, null, null, function(){
                me.hideLoading(parent);
            });
        },
        selectPage: function(e){
            e.preventDefault();
            var item = $(e.currentTarget);
            $('#cms-preview').height($(window).height() - 40);
            var parent = $('#cms-content');
            var me = this;
            var folder = item.attr('folder');
            var filename = item.attr('filename');
            me.selectedPage = {
                folder   : (folder && folder != '') ? folder : undefined,
                filename : filename
            };
            me.closeEditor();
            me.showLoading(parent);
            me.retrieveCMSPage(parent, me.selectedPage, function(data){
                me.selectedPage.data = data;
                $('#cms-content, #cms-actions').show();
                $('#cms-content-title-span').text((me.selectedPage.folder ? me.selectedPage.folder+'/' : '')+me.selectedPage.filename);
                me.setPreview();
            });
        },
        setPreview: function(data){
            data = data || this.selectedPage.data;
            if(this.getLayoutType() !== true){
                data = this.CMSLayout.replace('~~~Magnet_Layout_Body~~~', data);
            }
            $('#cms-preview').squirt(data.replace(/{{(.*?)}}/gm, ''));
            $('.lightbox, .lightboxOverlay').remove();
        },
        startCMSEdit: function(e){
            e.preventDefault();
            var me = this;
            $('#cms-editable-section').show('fast', function(){
                me.openEditor();
            });
        },
        openEditor: function(){
            this.editor = ace.edit('cms-editable-section');
            this.editor.setTheme('ace/theme/chrome');
            this.editor.getSession().setMode('ace/mode/html');
            this.editor.setValue(this.selectedPage.data, 1);
            $('#cms-preview, #cms-editable-section').height(($(window).height() / 2) - 40);
            $('#cms-preview').css('border-radius', '0 0 10px 10px');
            $('.cms-button').hide();
            $('.cms-editing-button').show();
        },
        endCMSEdit: function(e){
            e.preventDefault();
            var item = $(e.currentTarget);
            var action = item.attr('did');
            var data = this.editor.getValue();
            if(action == 'preview'){
                this.setPreview(data);
            }else{
                if(action == 'save'){
                    this.selectedPage.data = data;
                    this.updateCMSPage(this.selectedPage);
                }
                this.setPreview(this.selectedPage.data);
                this.closeEditor();
                this.resetButtons();
            }
        },
        closeEditor: function(){
            if(this.editor){
                this.editor.destroy();
                this.editor = undefined;
                $('#cms-editable-section').replaceWith('<div id="cms-editable-section" style="display:none"></div>');
                $('#cms-preview').height($(window).height() - 40);
                $('#cms-preview').css('border-radius', '10px');
            }
        },
        updateCMSPage: function(page){
            var me = this;
            var parent = $('#cms-content');
            me.resetButtons();
            me.options.mc.query('updateView', 'POST', page, function(){
                me.hideLoading(parent);
                Alerts.General.display({
                    title   : 'Page Updated Successfully',
                    content : 'The page you selected has been updated successfully.'
                });
            }, null, null, function(){
                me.hideLoading(parent);
            });
        },
        getLayoutType: function(){
            var status;
            for(var i=this.cmsPages.length;i--;)
                if((typeof this.selectedPage.folder === 'undefined' || this.cmsPages[i].folder === this.selectedPage.folder) && this.cmsPages[i].filename === this.selectedPage.filename)
                    status = this.cmsPages[i].noLayout;
            return status;
        },
        // show a simple popup with JSON data of the record
        showInfoPopup: function(e){
            var dom = $(e.currentTarget);
            if(dom.find('button').length == 0){
                var magnetId = dom.closest('tr').attr('data-id');
                Backbone.history.navigate('#/history/'+magnetId);
            }
        },
        // show log in a popup browser window
        showLog: function(e){
            var url = $(e.currentTarget).attr('did');
            window.open(url, '123894712893', 'width=600,height=400,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=0,top=0');
        },
        // send invitation to a user
        sendInvitation: function(){
            var me = this;
            var input = $('#invited-user-email');
            var parent = $('#app-management-container');
            me.showLoading(parent);
            me.options.mc.query('adminInviteUser', 'POST', {
                email   : input.val()
            }, function(){
                me.hideLoading(parent);
                me.options.eventPubSub.trigger('refreshListView');
                Alerts.General.display({
                    title   : 'Invitation Sent Successfully',
                    content : 'Your invitation email to '+input.val()+' has been sent successfully.'
                });
                input.val('');
            }, 'json', 'application/x-www-form-urlencoded', function(xhr, status, error){
                me.hideLoading(parent);
                Alerts.Error.display({
                    title   : 'Invitation Not Sent',
                    content : 'There was a problem sending the invitation: '+xhr.responseText
                });
            });
        },
        getConfig: function(){
            var me = this;
            me.options.mc.query('configs', 'GET', null, function(res){
                me.renderConfig(res);
            }, null, null, function(e){
                alert(e)
            });
        },
        // update configuration
        saveConfig: function(e){
            var me = this;
            var btn = $(e.currentTarget);
            var container = btn.closest('.admin-config-item-container');
            var did = container.attr('did');
            utils.resetError(container);
            var obj = utils.collect(container, false, false, true);
            var optionals = [];
            if(did == 'Database') optionals = ['password'];
            if(did == 'MMX') optionals = ['mysql.password'];
            if(!this.isValid(container, obj, optionals)) return;
            me.showLoading(container);
            AJAX('configs/'+did, 'POST', 'application/json', obj, function(){
                // restart
            }, function(e){
                me.hideLoading(container);
                if(did == 'MMX'){
                    if(e === 'already-configured'){
                        return Alerts.Confirm.display({
                            title   : 'Messaging Server Already Configured',
                            content : 'The messaging server at "'+obj.host+'" has already been configured. If you would like to connect to this messaging server without provisioning, click <b>Yes</b>. Otherwise, click <b>No</b> to try again with a different Hostname.'
                        }, function(){
                            me.setupMessaging(cb, true);
                        });
                    }
                    if(e === 'auth-failure'){
                        return Alerts.Error.display({
                            title   : 'Messaging Server Already Configured',
                            content : 'The messaging server at "'+obj.host+'" has already been configured, but the credentials you specified were invalid. Please try again with different credentials if you would like to connect to this messaging server without provisioning.'
                        });
                    }
                    if(e === 'not-found'){
                        return Alerts.Error.display({
                            title   : 'Messaging Server Not Found',
                            content : 'The messaging server at "'+obj.host+'" could not be reached. Please try again with a different hostname or port, and check your firewall configuration.'
                        });
                    }
                }else if(did == 'Database' || did == 'Redis'){
                    Alerts.Error.display({
                        title   : 'Connection Error',
                        content : 'Unable to connect to the database with the settings you provided. Please change your configuration and try again.'
                    });
                }else{
                    Alerts.Error.display({
                        title   : 'Error Updating Config '+did,
                        content : e
                    });
                }
            }, null, {
                redirectPort : (did == 'App') ? obj.port : null,
                cb           : function(location){
                    me.hideLoading(container);
                    $.ajax({
                        url        : '/rest/status',
                        beforeSend : function(xhr){
                            xhr.skipStatusCheck = true;
                        }
                    }).done(function(result, status, xhr){
                        var redirection = (xhr.status == 278 || xhr.status == 279) ? ' You will automatically be redirected to the login page after you close this dialog.' : '';
                        Alerts.General.display({
                            title   : did+' Config Updated Successfully',
                            content : 'The configuration for section <b>'+did+'</b> has been updated successfully and the server has been restarted.' + redirection
                        }, (location || '/'), 5000, true);
                    });
                }
            });
        },
        isValid: function(form, obj, optionals, emailValidationKeys){
            optionals = optionals || [];
            emailValidationKeys = emailValidationKeys || [];
            var valid = true;
            for(var key in obj){
                if(optionals.indexOf(key) === -1 && !$.trim(obj[key]).length){
                    var name = form.find('input[name="'+key+'"]').attr('placeholder');
                    utils.showError(form, key, 'Invalid '+name+'. '+name+' is a required field.');
                    valid = false;
                    break;
                }
                if(emailValidationKeys.indexOf(key) !== -1 && !utils.isValidEmail(obj[key])){
                    var name = form.find('input[name="'+key+'"]').attr('placeholder');
                    utils.showError(form, key, 'Invalid '+name+'. '+name+' must be a valid email address.');
                    valid = false;
                    break;
                }
            }
            return valid;
        },
        hideLoading: function(parent){
            if(!parent) return false;
            parent.find('.buttons-section').show();
            parent.find('.buttons-section.loading').hide();
        },
        showLoading: function(parent){
            parent.find('.buttons-section').hide();
            parent.find('.buttons-section.loading').show();
        },
        renderConfig: function(configs){
            var configContainer = $('#admin-configuration-container');
            configContainer.html(_.template($('#AdminConfigurationTmpl').html(), {
                configs          : configs,
                renderConfigItem : this.renderConfigItem
            })).find('.glyphicon-info-sign').tooltip();
        },
        renderConfigItem: function(section, config, allConfigs){
            var tmpl = $('#AdminConfiguration'+section+'Tmpl');
            if(!tmpl.length) return '';
            return _.template($('#AdminConfiguration'+section+'Tmpl').html(), {
                section    : section,
                levels     : ['silly', 'debug', 'verbose', 'info', 'warn', 'error'],
                config     : config,
                allConfigs : allConfigs
            });
        },
        onShareDBClick: function(e){
            if($(e.currentTarget).attr('did') === 'true')
                this.$el.find('#wizard-messaging-database-config').addClass('hidden');
            else
                this.$el.find('#wizard-messaging-database-config').removeClass('hidden');
        },
        createUser: function(e){
            var me = this;
            var btn = $(e.currentTarget);
            var container = btn.closest('.admin-config-item-container');
            utils.resetError(container);
            var obj = utils.collect(container);
            if(!this.isValid(container, obj, null, 'email')) return;
            me.showLoading(container);
            AJAX('users', 'POST', 'application/json', obj, function(){
                me.hideLoading(container);
                container.find('input').val('');
                Alerts.General.display({
                    title   : 'User Created Successfully',
                    content : 'The user <b>'+obj.email+'</b> has been created successfully.'
                });
            }, function(e){
                me.hideLoading(container);
                Alerts.Error.display({
                    title   : 'Error Creating User',
                    content : 'A user with the username <b>'+obj.email+'</b> already exists.'
                });
            });
        }
    });
    return View;
});