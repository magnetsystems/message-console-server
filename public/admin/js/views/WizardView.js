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
                me.renderDB();
                me.renderAdmin();
                me.renderMessaging();
            });
            options.eventPubSub.bind('initRestart', function(params){
                me.handleRestart(params, function(){
                    options.eventPubSub.trigger('initRestarted');
                    if(typeof params === 'object' && typeof params.cb === typeof Function) params.cb();
                });
            });
            me.dbDefaults = {
                host     : 'localhost',
                port     : 3306,
                dbName   : 'magnetmessaging',
                username : 'root'
            };
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
            var did = $(e.currentTarget).closest('.step-pane').attr('did');
            if(did === 'database'){
                me.setupDB(function(){
                    me.wizard.wizard('next');
                });
            }else if(did === 'admin'){
                me.createAdmin(function(){
                    me.wizard.wizard('next');
                });
            }else if(did === 'messaging'){
                me.setupMessaging(function(){
                    me.wizard.wizard('next');
                });
            }else{
                me.wizard.wizard('next');
            }
        },
        renderDB: function(){
            $('#wizard-db-container').html(_.template($('#WizardDBTmpl').html(), this.dbDefaults));
        },
        isValid: function(form, obj, optionals){
            optionals = optionals || [];
            var valid = true;
            for(var key in obj){
                if(optionals.indexOf(key) === -1 && !$.trim(obj[key]).length){
                    var name = form.find('input[name="'+key+'"]').attr('placeholder');
                    utils.showError(form, key, 'Invalid '+name+'. '+name+' is a required field.');
                    valid = false;
                    break;
                }
            }
            return valid;
        },
        setupDB: function(cb){
            var me = this;
            var form = $('#wizard-database-form');
            var btn = form.closest('.step-pane').find('.wiz-next');
            utils.resetError(form);
            var obj = utils.collect(form);
            if(!this.isValid(form, obj, ['password'])) return;
            obj.port = parseInt(obj.port);
            me.options.eventPubSub.trigger('btnLoading', btn);
            AJAX('admin/setDB', 'POST', 'application/json', obj, function(res){
                me.options.eventPubSub.trigger('btnComplete', btn);
                if(!$('#wizard-db-container > .alert').length){
                    $('#wizard-db-container').prepend(_.template($('#WizardDBTmpl').html(), {
                        active : true
                    }));
                }
                form.find('input[name^="password"]').val('');
                me.renderMessaging(obj);
                cb();
            }, function(e){
                me.options.eventPubSub.trigger('btnComplete', btn);
                Alerts.Error.display({
                    title   : 'Connection Error',
                    content : 'Unable to connect to the database with the settings you provided. Have you created the database "'+obj.dbName+'"?'
                });
            });
        },
        renderAdmin: function(){
            $('#wizard-admin-container').html(_.template($('#WizardSeedAdminTmpl').html()));
        },
        onShareDBClick: function(e){
            if($(e.currentTarget).attr('did') === 'true')
                this.$el.find('#wizard-messaging-database-config').addClass('hidden');
            else
                this.$el.find('#wizard-messaging-database-config').removeClass('hidden');
        },
        createAdmin: function(cb){
            var me = this;
            var form = $('#wizard-admin-form');
            var btn = form.find('.wiz-next');
            utils.resetError(form);
            var obj = utils.collect(form);
            if(!this.isValid(form, obj)) return;
            if(obj.password !== obj.passwordVerify){
                return utils.showError(form, 'passwordVerify', 'Passwords do not match. Please try again.');
            }
            me.options.eventPubSub.trigger('btnLoading', btn);
            AJAX('admin/setAdmin', 'POST', 'application/json', obj, function(res){
                me.options.eventPubSub.trigger('btnComplete', btn);
                if(!$('#wizard-admin-container > .alert').length){
                    $('#wizard-admin-container').prepend(_.template($('#WizardSeedAdminTmpl').html(), {
                        active : true
                    }));
                }
                cb();
            }, function(e){
                me.options.eventPubSub.trigger('btnComplete', btn);
                if(e == 'user-exists'){
                    Alerts.Confirm.display({
                        title   : 'User Already Exists',
                        content : 'This user already exists in the database. If you would like to continue with installation without configuring another user, click <b>Yes</b>. Otherwise, click <b>No</b> to try again with another user.'
                    }, function(){
                        form.find('input[name^="password"]').val('');
                        cb();
                    });
                }else{
                    alert(e);
                }
            });
        },
        renderMessaging: function(obj){
            $('#wizard-messaging-container').html(_.template($('#WizardMessagingTmpl').html(), obj || this.dbDefaults)).find('.glyphicon-info-sign').tooltip();
        },
        setupMessaging: function(cb, skipProvisioning){
            var me = this;
            var form = $('#wizard-messaging-form');
            var btn = form.find('.wiz-next');
            utils.resetError(form);
            var obj = utils.collect(form, false, false, true);
            if(!this.isValid(form, obj, ['mysqlPassword'])) return;
            me.options.eventPubSub.trigger('btnLoading', btn);
            if(skipProvisioning) obj.skipProvisioning = true;
            AJAX('admin/setMessaging', 'POST', 'application/json', obj, function(res){
                me.options.eventPubSub.trigger('btnComplete', btn);
                if(!$('#wizard-messaging-container > .alert').length){
                    $('#wizard-messaging-container').prepend(_.template($('#WizardMessagingTmpl').html(), {
                        active : true
                    }));
                }
                form.find('input[name^="password"]').val('');
                cb();
            }, function(e){
                me.options.eventPubSub.trigger('btnComplete', btn);
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
                Alerts.Error.display({
                    title   : 'Connection Error',
                    content : 'Unable to connect to the mesaging server with the settings you provided. <br />Error: '+e
                });
            });
        },
        completeWizard: function(e){
            var me = this;
            var btn = $(e.currentTarget);
            me.options.eventPubSub.trigger('btnLoading', btn);
            AJAX('admin/completeInstall', 'POST', 'application/json', null, null, function(e){
                me.options.eventPubSub.trigger('btnComplete', btn);
                alert(e);
            }, null, {
                btn : btn,
                cb  : function(){
                    window.location.href = '/';
                }
            });
        }
    });
    return View;
});
