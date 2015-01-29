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
//                me.renderMessaging();
            });
            options.eventPubSub.bind('initRestart', function(params){
                me.handleRestart(params, function(){
                    options.eventPubSub.trigger('initRestarted');
                    if(typeof params === 'object' && typeof params.cb === typeof Function) params.cb();
                });
            });
        },
        events: {
            'click .actions button': 'stepChanged',
            'click #complete-wizard-btn': 'completeWizard',
            'click .wiz-prev': 'prevStep',
            'click .wiz-next': 'nextStep',
            'keypress #wizard-admin-container input[name="credential"]': 'checkPasswordStrength',
            'click #wizard-random-key-btn': 'generateRandomKey'
        },
        render: function(){
            var template = _.template($('#ProjectWizardView').html());
            this.$el.find('#wizard-main-tab').html(template);
            this.$el.find('.glyphicon-info-sign').tooltip();
            return this;
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
                me.createSeedAdmin(function(){
                    me.wizard.wizard('next');
                });
            }else if(did === 'seedadmin'){
                me.createSeedAdmin(function(){
                    me.wizard.wizard('next');
                });
            }else{
                me.wizard.wizard('next');
            }
        },
        renderDB: function(){
            $('#wizard-db-container').html(_.template($('#WizardDBTmpl').html()));
            $('#wizard-db-container').find('.glyphicon-info-sign').tooltip();
        },
        isValid: function(form, obj){
            var valid = true;
            for(var key in obj){
                if(key != 'password' && !$.trim(obj[key]).length){
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
            if(!this.isValid(form, obj)) return;
            obj.port = parseInt(obj.port);
            me.options.eventPubSub.trigger('btnLoading', btn);
            AJAX('admin/setDB', 'POST', 'application/json', obj, function(res){
                me.options.eventPubSub.trigger('btnComplete', btn);
                if(!$('#wizard-db-container > .alert').length){
                    $('#wizard-db-container').prepend(_.template($('#WizardDBTmpl').html(), {
                        active : true
                    }));
                }
                cb();
            }, function(e){
                me.options.eventPubSub.trigger('btnComplete', btn);
                Alerts.Error.display({
                    title   : 'Connection Error',
                    content : 'Unable to connect to the database with the settings you provided. Has the database already been configured?'
                });
            });
        },
        renderAdmin: function(){
            $('#wizard-admin-container').html(_.template($('#WizardSeedAdminTmpl').html()));
        },
        createAdmin: function(cb){
            var me = this;
            var form = $('#project-wizard-container .step-pane[did="admin"]');
            var btn = form.find('.wiz-next');
            utils.resetError(form);
            var obj = utils.collect(form);
            if(!this.isValid(form, obj)) return;
            if(obj.seedDb === true){
                if($.trim(obj.userName).length < 1){
                    utils.showError(form, 'userName', 'Invalid Username. Username is a required field.');
                    return false;
                }else if($.trim(obj.credential.length) < 1){
                    utils.showError(form, 'password', 'Invalid Password. Password is a required field.');
                    return false;
                }else if(me.provisionDb === 'true' && obj.userName != obj.passwordVerify){
                    utils.showError(form, 'passwordVerify', 'Passwords do not match. Please try again.');
                    return false;
                }else if(_.intersection(me.invalidGroups, obj.securityGroups).length){
                    return utils.showError(form, 'securityGroups', 'You cannot use a reserved group name. Reserved group names: users, anonymous, everyone, and super-admin');
                }else if(!utils.isValidUsername(obj.userName)){
                    return utils.showError(form, 'userName', 'Usernames must consist only of letters, numbers, and the following special characters: -_.@');
                }
            }else{
                delete obj.credential;
                delete obj.securityGroups;
                delete obj.userName;
            }
            if(obj.cipherKeyConfig == 'inputkey' && $.trim(obj.cipherKey).length < 1){
                utils.showError(form, 'cipherKey', 'Invalid Cipher Key. Cipher Key is a required field.');
                return false;
            }
            delete obj.credentialVerify;
            delete obj.cipherKeyConfig;
            me.options.eventPubSub.trigger('btnLoading', btn);
            AJAX('idm/users/_admin', 'POST', 'application/json', obj, function(res){
                me.options.eventPubSub.trigger('btnComplete', btn);
                me.states.seedadmin = true;
                $('#wizard-admin-container').find('.alert-warning').hide('fast');
                $('#wizard-admin-container').html(_.template($('#WizardSeedAdminTmpl').html(), {
                    completed : true
                }));
                cb();
            }, function(e){
                me.options.eventPubSub.trigger('btnComplete', btn);
                alert(e);
            });
        },
        renderMessaging: function(cb){
            var me = this;
            me.states.seedadmin = (res === 'true');
            $('#wizard-admin-container').html(_.template($('#WizardSeedAdminTmpl').html(), {
                completed : me.states.seedadmin
            }));
            var adminForm = $('#wizard-admin-form');
            adminForm.html(_.template($('#CreateUserView').html(), {
                provisionDb : me.provisionDb,
                seedAdmin   : true
            }));
            me.renderRoles(adminForm, ['admins'], [true]);
        },
        renderRoles: function(dom, roles, requiredRoles){
            var template = _.template($('#UserRoleListView').html(), {
                roles         : roles,
                requiredRoles : requiredRoles
            });
            dom.find('.role-container').html(template);
            this.$el.find('.pillbox').pillbox({
                edit : true
            });
            this.$el.find('.pillbox .pill-group').append('<a href="#" class="btn btn-primary">Add</a>');
            return this;
        },
        checkPasswordStrength: function(e){
            setTimeout(function(){
                if(e.keyCode != 13){
                    var val = $(e.currentTarget).val();
                    if(val.length > 9 && val.match(/[a-z]+/) && val.match(/[A-Z]+/)){
                        $('#wizard-admin-container').find('.alert-warning').hide('fast');
                    }else{
                        $('#wizard-admin-container').find('.alert-warning').show('fast');
                    }
                }
            }, 50);
        },
        showSuccess: function(dom, name){
            var alert = $('<div class="alert alert-success" role="alert"><strong>Admin User Created</strong>admin user "'+name+'"  has been created.</div>');
            dom.find('.alert-container').html(alert);
            setTimeout(function(){
                alert.fadeOut('slow', function(){
                    alert.remove();
                });
            }, 5000);
        },
        checkForRestart: function(cb){
            var me = this;
            AJAX('provisioning/restart/status', 'GET', 'application/json', null, function(res){
                me.states.needrestart = res.required;
                if(!me.states.needrestart){
                    cb();
                }else{
                    me.handleRestart(true, cb);
                }
            }, function(e){
                me.options.eventPubSub.trigger('btnComplete', $('#complete-wizard-btn'));
                alert(e);
            });
        },
        handleRestart: function(params, cb){
            var me = this;
            params = typeof params === 'boolean' ? {
                isInstall : params
            } : (params || {});
            var tick = function(next, done){
                AJAX('provisioning/restart/status', 'GET', 'application/json', null, function(res){
                    me.states.needrestart = res.required;
                    if(me.states.needrestart === false){
                        me.$el.find('div[did="idm"] .button-group').css('visibility', 'visible');
                        done();
                    }else{
                        next();
                    }
                }, function(){
                    next();
                }, null, {
                    redirectHost : (me.options.opts.restartParams && me.options.opts.restartParams.redirectPort) ? (window.location.host.indexOf(':') != -1 ? window.location.host.replace(':'+window.location.port, ':'+me.options.opts.restartParams.redirectPort) : '') : null
                });
            };
            AJAX('provisioning/restart', 'POST', 'application/json', {
                kind : params.hard ? 'HARD' : ''
            }, function(res){
                me.handleLoadingModal('restart-wizard-modal', tick, cb);
            }, function(e){
                me.options.eventPubSub.trigger('btnComplete', $('#complete-wizard-btn'));
                alert(e);
            });
        },
        completeWizard: function(e){
            var me = this;
            var btn = $(e.currentTarget);
            me.options.eventPubSub.trigger('btnLoading', btn);
            me.checkForRestart(function(){
                me.options.eventPubSub.trigger('btnComplete', btn);
                me.options.opts.isInit = true;
                Backbone.history.navigate('#/login');
            });
        },
        generateRandomKey: function(e){
            var btn = $(e.currentTarget);
            var me = this, ctr = 5;
            var input = me.$el.find('input[name="cipherKey"]');
            input.val('');
            btn.removeClass('btn-success').addClass('btn-primary');
            btn.html('Move your mouse (5 seconds left)');
            var int = setInterval(function(){
                ctr -= 1;
                btn.html('Move your mouse ('+ctr+' seconds left)');
                if(ctr == 0){
                    btn.html('Generate Random Key');
                    alert('Not enough entropy collected. Click the Generate Random Key button and move the mouse more to generate a secure password.');
                    clearInterval(int);
                }
            }, 1000);
            utils.getRandomKey(function(key){
                btn.html('Generate Random Key');
                btn.removeClass('btn-primary').addClass('btn-success');
                input.val(key);
                clearInterval(int);
            });
        }
    });

    return View;
});
