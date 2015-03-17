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
                if(page == 'actions') me.getConfig(function(configs){
                    me.getMMXConfig(function(mmxconfig){
                        me.renderConfig(page, configs, ['App', 'MMX', 'Database', 'Redis', 'Email', 'Geologging'], {
                            MMX : mmxconfig
                        });
                        me.getGeotrackingState();
                    });
                });
                if(page == 'events') me.getConfig(function(configs){
                    me.renderConfig(page, configs, ['DatabaseLog', 'FileLog', 'EmailAlerts']);
                });
                if(page == 'overview') me.getConfig(function(configs){
                    me.getMMXConfig(function(mmxconfig){
                        me.getServerStats(function(stats){
                            me.renderOverview(configs, mmxconfig, stats);
                            me.getGeotrackingState();
                            me.setMessagingState(mmxconfig);
                        });
                    });
                });
//                if(page == 'messaging') me.getConfig(function(config){
//                    me.getMMXConfig(function(mmxconfig){
//                        me.renderMMXConfig(config, mmxconfig);
//                    });
//                }, 'MMX');
                me.selectedPage = {};
                $('#cms-folder-span, #cms-filename-span').text('');
            });
            $('#mgmt-users .radio-select .glyphicon-info-sign').tooltip();
        },
        // metadata for admin views
        pages: {
            'users' : {
                col      : UserCollection,
                headers  : {
                    createdAt : 'Created',
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
                    level     : 'Level',
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
            'click .cms-edit' : 'startCMSEdit',
            'click .cms-canceledit' : 'endCMSEdit',
            'click .cms-save' : 'endCMSEdit',
            'click div[did="edittype"] button': 'toggleEditingMode',
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
            $('#cms-content').hide();
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
                me.selectPage(null, me.$el.find('#cms-menu li').eq(0).find('a'));
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
        getGeotrackingState: function(){
            var me = this;
            var geoConnectivity = $('.geotracking-connectivity-container');
            me.options.mc.query('getGeotrackingState', 'GET', null, function(data){
                if(data.enabled){
                    geoConnectivity.html((data.connectivity === true ? '<label class="label label-success">Connected</label>' : '<label class="label label-danger">Not Connected</label>') + ((data.connectivity === false && data.lastConnected) ? ' <span>last connected: '+utils.ISO8601ToDT(data.lastConnected)+'</span>' : '' ));
                }else{
                    geoConnectivity.html('<label class="label label-default">Not Enabled</label>');
                }
            }, null, null, function(){
                geoConnectivity.html('<label class="label label-default">Not Enabled</label>');
            });
        },
        setMessagingState: function(available){
            var dom = $('.messaging-connectivity-container');
            if(available){
                dom.html('<label class="label label-success">Connected</label>');
            }else{
                dom.html('<label class="label label-danger">Not Connected</label>');
            }
        },
        selectPage: function(e, dom){
            if(e) e.preventDefault();
            var item = dom || $(e.currentTarget);
            item.closest('.nav').find('li').removeClass('active');
            item.closest('li').addClass('active');
            var parent = $('#cms-content').closest('.panel');
            var me = this;
            var folder = item.attr('folder');
            var filename = item.attr('filename');
            me.selectedPage = {
                folder   : (folder && folder != '') ? folder : undefined,
                filename : filename
            };
            me.closeEditor();
            me.showLoading(parent);
            me.resetCMSControls(null, parent);
            me.retrieveCMSPage(parent, me.selectedPage, function(data){
                me.selectedPage.data = data;
                $('#cms-content, #cms-preview').show();
                $('#cms-content-title-span').text((me.selectedPage.folder ? me.selectedPage.folder+'/' : '')+me.selectedPage.filename);
                me.setPreview();
            });
        },
        resetCMSControls: function(e, dom){
            var parent = dom || $(e.currentTarget).closest('.panel');
            parent.find('.panel-heading div[did="readonly"] .disableable').removeClass('disabled');
            parent.find('.panel-heading div[did="readwrite"] .disableable').addClass('disabled');
            var tog = parent.find('.btn-toggle');
            tog.find('button[did="code"]').removeClass('btn-primary active').addClass('btn-default disabled');
            tog.find('button[did="preview"]').addClass('btn-primary active disabled').removeClass('btn-default');
            $('#cms-editable-section').hide();
            $('#cms-preview').show();
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
            $('#cms-preview').hide();
            $('#cms-editable-section').show('fast', function(){
                me.openEditor(e);
            });
        },
        openEditor: function(e){
            var btn = $(e.currentTarget);
            var panel = btn.closest('.panel');
            this.editor = ace.edit('cms-editable-section');
            this.editor.setTheme('ace/theme/chrome');
            this.editor.getSession().setMode('ace/mode/html');
            this.editor.setValue(this.selectedPage.data, 1);
            panel.find('.panel-heading div[did="readonly"] .disableable').addClass('disabled');
            panel.find('.panel-heading div[did="readwrite"] .disableable').removeClass('disabled');
            panel.find('.panel-heading .btn-toggle button').removeClass('disabled');
            var tog = panel.find('.btn-toggle');
            tog.find('button[did="preview"]').removeClass('btn-primary active').addClass('btn-default');
            tog.find('button[did="code"]').addClass('btn-primary active').removeClass('btn-default');
        },
        toggleEditingMode: function(e){
            var me = this;
            setTimeout(function(){
                var btn = $(e.currentTarget);
                me.setPreview(me.selectedPage.data);
                if($(e.currentTarget).closest('.btn-toggle').find('.btn-primary').attr('did') == 'preview'){
                    me.setPreview(me.editor.getValue());
                    $('#cms-editable-section').hide();
                    $('#cms-preview').show();
                }else{
                    $('#cms-editable-section').show();
                    $('#cms-preview').hide();
                }
            }, 5);
        },
        endCMSEdit: function(e){
            e.preventDefault();
            var btn = $(e.currentTarget);
            var panel = btn.closest('.panel');
            var action = btn.attr('did');
            var data = this.editor.getValue();
            if(action == 'preview'){
                this.setPreview(data);
            }else{
                if(action == 'save'){
                    this.selectedPage.data = data;
                    this.updateCMSPage(this.selectedPage);
                }
                this.setPreview(this.selectedPage.data);
                this.resetCMSControls(null, panel);
//                this.closeEditor();
            }
        },
        closeEditor: function(){
            if(this.editor){
                this.editor.destroy();
                this.editor = undefined;
                $('#cms-editable-section').replaceWith('<div id="cms-editable-section" style="display:none"></div>');
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
            var parent = input.closest('admin-config-item-container');
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
                var msg = xhr.responseText;
                if(xhr.responseText == 'email-disabled')
                    msg = 'The <b>Email</b> service has not been enabled in the Server Configuration page, so the user cannot be invited. If you would like to create a user without going through the email confirmation process, use the <b>Create a User</b> feature.';
                if(xhr.responseText == 'error-sending-email')
                    msg = 'There was an error sending out the email, so the invitation could not be completed. Check your email configuration in the <b>Email</b> section of the Server Configuration page. If you would like to create a user without going through the email confirmation process, use the <b>Create a User</b> feature.';
                Alerts.Error.display({
                    title   : 'Invitation Not Sent',
                    content : 'There was a problem sending the invitation: '+msg
                });
            });
        },
        getConfig: function(cb, config){
            var me = this;
            me.options.mc.query('configs'+(config ? '/'+config : ''), 'GET', null, function(res){
                cb(res);
            }, null, null, function(e){
                alert(e);
            });
        },
        getMMXConfig: function(cb){
            var me = this;
            me.options.mc.query('apps/configs', 'GET', null, function(res){
                cb(res.configs || res);
            }, null, null, function(e){
                cb();
            });
        },
        getServerStats: function(cb){
            var me = this;
            me.options.mc.query('stats', 'GET', null, function(res){
                cb(res);
            }, null, null, function(e){
                cb();
            });
        },
        // update configuration
        saveConfig: function(e, btn, obj){
            var me = this;
            btn = btn || $(e.currentTarget);
            var container = btn.closest('.admin-config-item-container');
            var did = container.attr('did');
            utils.resetError(container);
            obj = obj || utils.collect(container, false, false, true);
            var optionals = [];
            if(did == 'Database') optionals = ['password'];
            if(did == 'Redis') optionals = ['pass'];
            if(did == 'Email' && obj.enabled === false) optionals = ['host', 'user', 'password', 'sender'];
            if(did == 'MMX'){
                optionals = ['password'];
                obj.mmxconfig = utils.collect(container.find('div[did="mmx-config"]'));
            }
            if(!this.isValid(container, obj, optionals)) return;
            me.showLoading(container);
            AJAX('configs/'+did, 'POST', 'application/json', obj, function(res){
                me.hideLoading(container);
                if(res != 'restart-needed'){
                    if(did == 'MMX')
                        me.getConfig(function(config){
                            me.getMMXConfig(function(mmxconfig){
                                me.renderMMXConfig(config, mmxconfig);
                            });
                        }, 'MMX');
                    if(did == 'Geologging')
                        me.getGeotrackingState();
                    Alerts.General.display({
                        title   : did+' Config Updated Successfully',
                        content : 'The configuration for section <b>'+did+'</b> has been updated successfully.'
                    });
                }
            }, function(e){
                me.hideLoading(container);
                if(did == 'MMX'){
                    if(e === 'auth-failure'){
                        return Alerts.Error.display({
                            title   : 'Messaging Server Already Configured',
                            content : 'The credentials you specified were invalid. Please try again with different credentials if you would like to connect to this messaging server.'
                        });
                    }
                    if(e === 'not-found' || e === 'connect-error'){
                        return Alerts.Error.display({
                            title   : 'Messaging Server Not Found',
                            content : 'The messaging server at "'+obj.host+'" could not be reached. Please try again with a different hostname or port, and check your firewall configuration.'
                        });
                    }
                }else if(did == 'Database'){
                    if(e == 'ER_BAD_DB_ERROR'){
                        return Alerts.Confirm.display({
                            title   : 'Database Does Not Exist',
                            content : 'The database "'+obj.dbName+'" does not exist. If the database credentials you specified have authority to create a database, click <b>Yes</b> to have the server create the database automatically. Otherwise, click <b>No</b> to try again with another database name.'
                        }, function(){
                            obj.createDatabase = true;
                            me.saveConfig(null, btn, obj);
                        });
                    }
                    if(e == 'DB_ALREADY_EXISTS'){
                        return Alerts.Confirm.display({
                            title   : 'Database Already Exists',
                            content : 'The database "'+obj.dbName+'" already exists. If you would like to use this database, click <b>Yes</b> to have the server connect to this database non-destructively and add any additional tables as necessary. Otherwise, click <b>No</b> to try again with another database name.'
                        }, function(){
                            obj.createDatabase = true;
                            me.saveConfig(null, btn, obj);
                        });
                    }
                    if(e == 'ENOTFOUND'){
                        return Alerts.Error.display({
                            title   : 'Not Found',
                            content : 'There was no database server found at the hostname and port you specified.'
                        });
                    }
                    if(e == 'ER_CONNREFUSED'){
                        return Alerts.Error.display({
                            title   : 'Connection Refused',
                            content : 'The server at the hostname and port you specified refused the connection.'
                        });
                    }
                    if(e == 'ER_DBACCESS_DENIED_ERROR' || e === 'ER_ACCESS_DENIED_ERROR'){
                        return Alerts.Error.display({
                            title   : 'Access Denied',
                            content : 'The database credentials you specified did not have authority to access the database you specified.'
                        });
                    }
                    if(!e) e = 'Connection timed out. Please make sure you can reach the mysql server at the hostname and port you specified.';
                    return Alerts.Error.display({
                        title   : 'Connection Error',
                        content : 'Unable to connect to the database with the settings you provided. <br />'+e
                    });
                }else if(did == 'Database' || did == 'Redis'){
                    Alerts.Error.display({
                        title   : 'Connection Error',
                        content : 'Unable to connect to the database with the settings you provided. Please change your configuration and try again.'
                    });
                }else if(did == 'Geologging'){
                    Alerts.Error.display({
                        title   : 'Connection Error',
                        content : 'Unable to connect to the XMPP domain with the settings you provided. Please change your configuration and try again.'
                    });
                }else{
                    Alerts.Error.display({
                        title   : 'Error Updating Config '+did,
                        content : e
                    });
                }
            }, null, {
                redirectPort : (did == 'App') ? obj.port : null,
                timeout      : 15000,
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
                        }, (location || '/admin')+'#/actions', 5000, true);
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
        renderOverview: function(configs, mmxconfig, stats){
            $('#mgmt-overview').html(_.template($('#AdminOverviewTmpl').html(), {
                configs   : configs,
                mmxconfig : mmxconfig,
                stats     : stats
            })).find('.glyphicon-info-sign').tooltip();
        },
        renderConfig: function(page, configs, allowed, featureConfigs){
            allowed = allowed || [];
            featureConfigs = featureConfigs || {};
            var configContainer = $('#mgmt-'+page).find('.admin-configuration-container');
            configContainer.html(_.template($('#AdminConfigurationTmpl').html(), {
                configs          : configs,
                featureConfigs   : featureConfigs,
                allowed          : allowed,
                renderConfigItem : this.renderConfigItem
            })).find('.glyphicon-info-sign, .toggling-password-input .glyphicon').tooltip();
        },
        renderConfigItem: function(section, config, allConfigs, featureConfig){
            var tmpl = $('#AdminConfiguration'+section+'Tmpl');
            if(!tmpl.length) return '';
            return _.template($('#AdminConfiguration'+section+'Tmpl').html(), {
                section       : section,
                levels        : ['silly', 'debug', 'verbose', 'info', 'warn', 'error'],
                config        : config,
                allConfigs    : allConfigs,
                featureConfig : featureConfig
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
                me.options.eventPubSub.trigger('refreshListView');
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