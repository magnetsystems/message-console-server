define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: "#wizard-container",
        initialize: function(options){
            var me = this;
            me.options = options;
            me.states = {};
            options.eventPubSub.bind('initWizardView', function(){
                me.setElement('#wizard-container');
                me.render();
                me.wizard = $('#project-wizard-container');
                me.getConfigs(function(){
                    me.renderDB();
                    me.renderAdmin();
                    me.renderMessaging();
                });
            });
            options.eventPubSub.bind('initRestart', function(params){
                me.handleRestart(params, function(){
                    options.eventPubSub.trigger('initRestarted');
                    if(typeof params === 'object' && typeof params.cb === typeof Function) params.cb();
                });
            });
            me.messagingCompleteStatusModal = $('#messaging-provision-status-modal');
        },
        events: {
            'click .actions button': 'stepChanged',
            'click #complete-wizard-btn': 'completeWizard',
            'click .wiz-prev': 'prevStep',
            'click .wiz-next': 'nextStep',
            'click div[did="shareDB"] button': 'onShareDBClick'
        },
        render: function(){
            var template = _.template($('#ProjectWizardView').html());
            this.$el.find('#wizard-main-tab').html(template);
        },
        stepChanged: function(){
            var view = $('#project-wizard-container .steps li.active').attr('did');
            if(view == 'finish')
                $('.wizard button[data-last="Complete"]').css('visibility', 'hidden');
            else
                $('.wizard button[data-last="Complete"]').css('visibility', 'visible');
        },
        prevStep: function(){
            this.wizard.wizard('previous');
        },
        nextStep: function(e){
            var me = this;
            var container = $(e.currentTarget).closest('.step-pane');
            var did = container.attr('did');
            if(did === 'intro'){
                var installType = container.find('.btn-group[did="installType"] button.active').attr('did');
                if(installType == 'standard'){
                    me.standardInstall($(e.currentTarget));
                }else{
                    me.wizard.wizard('next');
                }
            }else if(did === 'database'){
                me.setupDB(function(){
                    me.wizard.wizard('next');
                }, null, null, true);
            }else if(did === 'admin'){
                me.createAdmin(function(){
                    me.wizard.wizard('next');
                });
            }else if(did === 'messaging'){
                me.setupMessaging(function(){
                    me.renderWizardSummary();
                    me.wizard.wizard('next');
                });
            }else{
                me.wizard.wizard('next');
            }
        },
        standardInstall: function(btn){
            var me = this;
            var modal = $('#wait-modal');
            me.options.eventPubSub.trigger('btnLoading', btn, true);
            modal.find('.graytxt').text('Configuring MySQL database');
            me.setupDB(function(){
                modal.find('.graytxt').text('Creating admin account');
                me.createAdmin(function(){
                    modal.find('.graytxt').text('Configuring messaging server');
                    me.setupMessaging(function(){
                        me.options.eventPubSub.trigger('btnComplete', btn, true);
                        me.renderWizardSummary();
                        me.wizard.wizard('selectedItem', {
                            step : 5
                        });
                    }, function(){
                        me.options.eventPubSub.trigger('btnComplete', btn, true);
                        me.wizard.wizard('selectedItem', {
                            step : 4
                        });
                    }, me.messagingDefaults);
                }, function(){
                    me.options.eventPubSub.trigger('btnComplete', btn, true);
                    me.wizard.wizard('selectedItem', {
                        step : 3
                    });
                }, me.userDefaults);
            }, function(){
                me.options.eventPubSub.trigger('btnComplete', btn, true);
                me.wizard.wizard('selectedItem', {
                    step : 2
                });
            }, _.extend({createDatabase:true}, me.dbDefaults), true);
        },
        renderWizardSummary: function(){
            $('#wizard-summary-table').html(_.template($('#WizardSummaryTmpl').html(), {
                db   : this.dbDefaults,
                user : this.userDefaults,
                mmx  : this.messagingDefaults
            }));
            setTimeout(function(){
                $('#project-wizard-container li.complete').removeClass('complete');
            }, 1000);
        },
        renderDB: function(){
            $('#wizard-db-container').html(_.template($('#WizardDBTmpl').html(), this.dbDefaults));
        },
        isValid: function(form, obj, optionals){
            optionals = optionals || [];
            var valid = true;
            for(var key in obj){
                if(optionals.indexOf(key) === -1 && !$.trim(obj[key]).length){
                    var name = form.find('input[name="'+key+'"]').closest('div[class^="col"]').find('> label').text();
                    utils.showError(form, key, 'Invalid '+name+'. '+name+' is a required field.');
                    valid = false;
                    break;
                }
            }
            return valid;
        },
        getConfigs: function(cb){
            var me = this;
            AJAX('configs', 'GET', 'application/json', null, function(res){
                res.Database = res.Database || {};
                res.MMX = res.MMX || {};
                me.dbDefaults = {
                    host     : res.Database.host || 'localhost',
                    password : res.Database.password || '',
                    port     : res.Database.port || 3306,
                    dbName   : res.Database.dbName || 'magnetmessagedb',
                    username : res.Database.username || 'root'
                };
                me.userDefaults = {
                    email          : 'sysadmin@company.com',
                    password       : 'admin',
                    passwordVerify : 'admin'
                };
                me.messagingDefaults = {
                    shareDB         : res.MMX.shareDB || true,
                    host            : res.MMX.host || 'localhost',
                    mysqlUser       : res.Database.username || 'root',
                    mysqlPassword   : res.Database.password || '',
                    mysqlHost       : res.Database.host || 'localhost',
                    mysqlPort       : res.Database.port || 3306,
                    mysqlDb         : res.Database.dbName || 'magnetmessagedb',
                    user            : res.MMX.user || 'admin',
                    password        : res.MMX.password || 'admin'
                };
                cb(res);
            }, function(e){
                alert(e);
            });
        },
        setupDB: function(cb, fb, obj, silentInstall){
            var me = this;
            var form = $('#wizard-database-form');
            var btn = form.closest('.step-pane').find('.wiz-next');
            utils.resetError(form);
            obj = obj || utils.collect(form);
            obj.dialect = 'mysql';
            if(!this.isValid(form, obj, ['password'])) return (fb || function(){})();
            obj.port = parseInt(obj.port);
            me.options.eventPubSub.trigger('btnLoading', btn);
            AJAX('admin/setDB', 'POST', 'application/json', obj, function(res){
                // immediately after completion
                me.options.eventPubSub.trigger('btnComplete', btn);
                if(!$('#wizard-db-container > .alert').length){
                    $('#wizard-db-container').prepend(_.template($('#WizardDBTmpl').html(), {
                        active : true
                    }));
                }
                _.extend(me.dbDefaults, obj);
                form.find('input[name^="password"]').val('');
                me.messagingDefaults.mysqlDb = obj.dbName;
                me.messagingDefaults.mysqlHost = obj.host;
                me.messagingDefaults.mysqlPassword = obj.password;
                me.messagingDefaults.mysqlPort = obj.port;
                me.messagingDefaults.mysqlUser = obj.username;
                me.renderMessaging();
                cb();
            }, function(e){
                me.options.eventPubSub.trigger('btnComplete', btn);
                if(e == 'ER_BAD_DB_ERROR'){
                    return Alerts.Confirm.display({
                        title   : 'Database Does Not Exist',
                        content : 'The database "'+obj.dbName+'" does not exist. If the database credentials you specified have authority to create a database, click <b>Yes</b> to have the server create the database automatically. Otherwise, click <b>No</b> to try again with another database name.'
                    }, function(){
                        obj.createDatabase = true;
                        me.setupDB(cb, null, obj, silentInstall);
                    });
                }
                if(e == 'DB_ALREADY_EXISTS'){
                    return Alerts.Confirm.display({
                        title   : 'Database Already Exists',
                        content : 'The database "'+obj.dbName+'" already exists. Do you want to use this database and allow setup to modify it?',
                        btns    : {
                            yes : 'Continue',
                            no  : 'Cancel'
                        }
                    }, function(){
                        obj.createDatabase = true;
                        me.setupDB(cb, null, obj, silentInstall);
                    });
                }
                (fb || function(){})();
                if(e == 'ENOTFOUND'){
                    return Alerts.Error.display({
                        title   : 'Not Found',
                        content : 'There was no database server found at the hostname and port you specified.'
                    });
                }
                if(e == 'ER_CONNREFUSED' || e == 'ECONNREFUSED'){
                    return Alerts.Error.display({
                        title   : 'Connection Refused',
                        content : 'The server at the hostname and port you specified refused the connection. Please check if MySQL server is installed and running.'
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
            }, null, {
                silent  : silentInstall,
                cb      : function(){
                },
                timeout : 15000
            });
        },
        renderAdmin: function(){
            $('#wizard-admin-container').html(_.template($('#WizardSeedAdminTmpl').html()));
        },
        onShareDBClick: function(e){
            var me = this;
            setTimeout(function(){
                if($(e.currentTarget).parent().find('.btn-primary').attr('did') == 'true')
                    me.$el.find('#wizard-messaging-database-config').addClass('hidden');
                else
                    me.$el.find('#wizard-messaging-database-config').removeClass('hidden');
            }, 50);
        },
        createAdmin: function(cb, fb, obj){
            var me = this;
            var form = $('#wizard-admin-form');
            var btn = form.closest('.step-pane').find('.wiz-next');
            utils.resetError(form);
            obj = obj || utils.collect(form);
            if(obj.password !== obj.passwordVerify){
                utils.showError(form, 'passwordVerify', 'Passwords do not match. Please try again.');
                return (fb || function(){})();
            }else if(!utils.isValidEmail(obj.email)){
                utils.showError(form, 'email', 'Invalid Email. The Email Address field must contain a valid email address.');
                return false;
            }
            if(!this.isValid(form, obj)) return (fb || function(){})();
            me.options.eventPubSub.trigger('btnLoading', btn);
            AJAX('admin/setAdmin', 'POST', 'application/json', obj, function(res){
                me.options.eventPubSub.trigger('btnComplete', btn);
                if(!$('#wizard-admin-container > .alert').length){
                    $('#wizard-admin-container').prepend(_.template($('#WizardSeedAdminTmpl').html(), {
                        active : true
                    }));
                }
                _.extend(me.userDefaults, obj);
                cb();
            }, function(e){
                (fb || function(){})();
                me.options.eventPubSub.trigger('btnComplete', btn);
                if(e == 'invalid-login'){
                    Alerts.Error.display({
                        title   : 'Account Already Exists',
                        content : 'This account already exists in the database, but the password you specified was incorrect. Please type the correct password for this account, or choose another email address.'
                    });
                }else{
                    alert(e);
                }
            });
        },
        renderMessaging: function(){
            $('#wizard-messaging-container').html(_.template($('#WizardMessagingTmpl').html(), this.messagingDefaults)).find('.glyphicon-info-sign').tooltip();
        },
        setupMessaging: function(cb, fb, obj){
            var me = this;
            var form = $('#wizard-messaging-form');
            var btn = form.closest('.step-pane').find('.wiz-next');
            utils.resetError(form);
            obj =  obj || utils.collect(form, false, false, true);
            if(!this.isValid(form, obj, ['mysqlPassword'])) return (fb || function(){})();
            me.options.eventPubSub.trigger('btnLoading', btn);
            AJAX('admin/messagingStatus', 'POST', 'application/json', obj, function(res){
                me.options.eventPubSub.trigger('btnComplete', btn);
                _.extend(me.messagingDefaults, obj);
                if(res.code === 200 && res.provisioned === false)
                    return me.provisionMessaging(form, btn, obj, cb, fb);
                (fb || function(){})();
                if(res.code === 200 && res.provisioned === true){
                    return Alerts.Confirm.display({
                        title   : 'Messaging Server Already Configured',
                        content : 'The messaging server at "'+obj.host+'" has already been configured. If you would like to connect to this messaging server without provisioning, click <b>Yes</b>. Otherwise, click <b>No</b> to try again with a different Hostname.'
                    }, function(){
                        obj.skipProvisioning = true;
                        me.provisionMessaging(form, btn, obj, cb);
                    }, function(){
                        (fb || function(){})();
                    });
                }
                if(res.code === 403){
                    return Alerts.Error.display({
                        title   : 'Messaging Server Already Configured',
                        content : 'The messaging server at "'+obj.host+'" has already been configured, but the credentials you specified were invalid. Please try again with different credentials if you would like to connect to this messaging server without provisioning.'
                    });
                }
                Alerts.Error.display({
                    title   : 'Connection Error',
                    content : 'Unable to connect to the messaging server with the settings you provided. Please try again with a different hostname or port, and check your firewall configuration. '+(res.msg ? '<br />Error: '+res.msg : '')
                });
            }, function(e){
                (fb || function(){})();
                me.options.eventPubSub.trigger('btnComplete', btn);
                Alerts.Error.display({
                    title   : 'Connection Error',
                    content : 'Unable to connect to the server. Please make sure the server is running and check logs for additional diagnostic information.'
                });
            }, null, {
                timeout : 15000
            });
        },
        provisionMessaging: function(form, btn, obj, cb, fb){
            var me = this;
            me.options.eventPubSub.trigger('btnLoading', btn);
            AJAX('admin/setMessaging', 'POST', 'application/json', obj, function(res){
                if(obj.skipProvisioning){
                    me.options.eventPubSub.trigger('btnComplete', btn);
                    cb();
                }else{
                    me.pollMessagingCompleteStatus(btn, function(){
                        if(!$('#wizard-messaging-container > .alert').length){
                            $('#wizard-messaging-container').prepend(_.template($('#WizardMessagingTmpl').html(), {
                                active : true
                            }));
                        }
                        cb();
                    }, fb);
                }
            }, function(e){
                (fb || function(){})();
                me.options.eventPubSub.trigger('btnComplete', btn);
                Alerts.Error.display({
                    title   : 'Connection Error',
                    content : 'Unable to connect to the messaging server with the settings you provided. Please try again with a different hostname or port, and check your firewall configuration. '+(e ? '<br />Error: '+e : '')
                });
            }, null, {
                timeout : 120000
            });
        },
        pollMessagingCompleteStatus: function(btn, cb, fb){
            var me = this;
            var id = '#messaging-provision-status-refresh';
            me.pollAttempts = 0;
            me.polling = true;
            timer.poll(function(loop){
                me.checkMessagingCompleteStatus(function(){
                    timer.stop(id);
                    me.options.eventPubSub.trigger('btnComplete', btn);
                    cb();
                }, function(xhr){
                    me.pollAttempts += 1;
                    if(me.pollAttempts > 60){
                        timer.stop(id);
                        me.options.eventPubSub.trigger('btnComplete', btn);
                        Alerts.Error.display({
                            title   : 'Unrecoverable Error',
                            content : 'The installation experienced an unrecoverable error attempting to install the message server. ' +
                                'Please make sure you have MySQL installed properly, and try reinstalling again.'
                        });
                        return (fb || function(){})();
                    }
                    loop.paused = false;
                });
            }, 1000, id);
        },
        checkMessagingCompleteStatus: function(cb, fb){
            AJAX('admin/messagingCompleteStatus', 'GET', 'application/json', null, cb, fb, null, {
                timeout : 15000
            });
        },
        completeWizard: function(e){
            var me = this;
            var btn = $(e.currentTarget);
            me.options.eventPubSub.trigger('btnLoading', btn);
            AJAX('admin/completeInstall', 'POST', 'application/json', null, null, function(e){
                alert(e);
            }, null, {
                silent : true,
                cb     : function(){
                    me.resetSummary();
                    me.options.eventPubSub.trigger('btnComplete', btn);
                    window.location.href = '/admin';
                }
            });
        },
        resetSummary: function(){
            this.dbDefaults = {};
            this.userDefaults = {};
            this.messagingDefaults = {};
            this.renderWizardSummary();
        }
    });
    return View;
});
