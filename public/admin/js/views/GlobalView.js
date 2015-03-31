define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: "body",
        initialize: function(options){
            var me = this;
            var loadingModal = $('#wait-modal');
            me.options = options;
            me.options.eventPubSub.bind("btnLoading", function(btn, showLoading){
                if(showLoading) loadingModal.modal('show');
                btn.attr('txt', btn.html()).html('<span class="glyphicon glyphicon-refresh glyphicon-refresh-animate"></span> Loading..').addClass('disabled');
            });
            me.options.eventPubSub.bind("btnComplete", function(btn, showLoading){
                if(showLoading) loadingModal.modal('hide');
                if(btn.attr('txt')) btn.html(btn.attr('txt')).removeClass('disabled');
            });
            me.options.eventPubSub.bind('resetPages', function(page){
                me.selectPage(page);
            });
            me.options.eventPubSub.bind('resetAdminPages', function(page){
                me.selectPage(page, '.page');
            });
            me.options.eventPubSub.bind('setHeaderNavigation', function(params){
                me.setHeaderNavigation(params);
            });
            options.eventPubSub.bind('getUserProfile', function(callback){
                me.getProfile(callback);
            });
            GlobalEventDispatcher.generalEventPubSub = _.extend({}, Backbone.Events);
            GlobalEventDispatcher.generalEventPubSub.bind('initRestart', function(params){
                me.handleRestart(params);
            });
            $('.radio-select input[type="radio"]').eq(0).prop('checked', true);
            $('#user-identity').popover({
                placement : 'bottom',
                template  : '<div class="popover" role="tooltip"><div class="arrow"></div><div class="popover-content"></div><h3 class="popover-title"></h3></div>',
                html      : true
            });
            $('#page-select').popover({
                placement : 'bottom',
                template  : '<div class="popover" role="tooltip"><div class="arrow"></div><div class="popover-content"></div><h3 class="popover-title"></h3></div>',
                html      : true
            });
        },
        events: {
            'click .goBack': 'goBack',
            'click #logout-btn': 'logout',
            'click #user-panel-toggle': 'toggleUserPanel',
            'click .btn-toggle button': 'toggleSwitch',
            'click .restart-server-btn': 'restartServer',
            'click .show-profile-btn': 'showProfile',
            'change .radio-select  input[type="radio"]': 'selectRadio',
            'click .toggling-password-input .glyphicon': 'togglePasswordContainer'
        },
        goBack: function(e){
            e.preventDefault();
            window.history.back();
        },
        logout: function(e){
            e.preventDefault();
            this.options.eventPubSub.trigger('setHeaderNavigation');
            AJAX('/rest/logout', 'POST', 'application/json', null, function(){
                Backbone.history.navigate('#/login');
            }, function(e){
                Backbone.history.navigate('#/login');
            });
        },
        showProfile: function(e){
            e.preventDefault();
            this.options.eventPubSub.trigger('initProfile');
        },
        toggleUserPanel: function(e){
            e.preventDefault();
            var dom = $('#user-panel');
            if(dom.css('display') == 'block'){
                dom.slideUp('fast');
            }else{
                dom.slideDown('fast');
            }
        },
        selectPage: function(page, view){
            $('#user-panel').slideUp('fast');
            var pages = $(view || '.page-view');
            pages.addClass('hidden');
            if(page){
                $('#'+page).removeClass('hidden');
            }
        },
        selectRadio: function(e){
            var radio = $(e.currentTarget);
            var parent = radio.closest('.radio-select');
            parent.find('.radio-item-container').addClass('hidden');
            parent.find('#'+radio.val()).removeClass('hidden');
        },
        handleRestart: function(params){
            var me = this;
            params = params || {};
            var location = params.redirectPort ? (window.location.host.indexOf(':') != -1 ? window.location.protocol+'//'+window.location.host.replace(':'+window.location.port, ':'+params.redirectPort) : '') : '';
            var tick = function(next, done){
                if(location !== ''){
                    params.location = location+'/admin';
                    pingHost(location, done, next);
                }else{
                    AJAX('/rest/beacon', 'GET', 'text/plain', null, function(res){
                        if(res == 'ok'){
                            done();
                        }else{
                            next();
                        }
                    }, function(){
                        next();
                    });
                }
            };
            setTimeout(function(){
                AJAX('restart', 'POST', 'application/json', null, function(res){
                    me.serverRestartModal('restart-modal', tick, params);
                }, function(e){
                    me.serverRestartModal('restart-modal', tick, params);
                });
            }, 100);
        },
        serverRestartModal: function(sel, tick, params){
            var me = this;
            var progress = 0;
            var modal = $('#'+sel);
            var dom = modal.find('.progress-bar');
            dom.attr('aria-valuenow', 100);
            dom.css('width', '100%');
            if(!params.silent) modal.modal('show');
            GLOBAL.polling = true;
            var prog = setInterval(function(){
                ++progress;
                if(progress > 99){
                    GLOBAL.polling = false;
                    modal.modal('hide');
                    clearInterval(prog);
                    $('#restart-failed-modal').modal('show');
                }
            }, 100);
            me.doPoll(tick, 1000, function(){
                GLOBAL.polling = false;
                modal.modal('hide');
                if(typeof params.cb === typeof Function) params.cb(params.location);
                if(params.redirectPort) window.location.href = params.location;
                clearInterval(prog);
            });
        },
        doPoll: function(tick, int, cb){
            var me = this;
            setTimeout(function(){
                if(!GLOBAL.polling) return;
                tick(function(){
                    me.doPoll(tick, int, cb);
                }, cb);
            }, int);
        },
        toggleSwitch: function(e){
            var tog = $(e.currentTarget).parent();
            if(tog.find('.btn').hasClass('disabled')){
                return;
            }
            tog.find('.btn').toggleClass('active');
            if(tog.find('.btn-primary').size()>0)
                tog.find('.btn').toggleClass('btn-primary');
            if(tog.find('.btn-danger').size()>0)
                tog.find('.btn').toggleClass('btn-danger');
            if(tog.find('.btn-success').size()>0)
                tog.find('.btn').toggleClass('btn-success');
            if(tog.find('.btn-info').size()>0)
                tog.find('.btn').toggleClass('btn-info');
            tog.find('.btn').toggleClass('btn-default');
            if(tog.attr('did') === 'enabled'){
                var parent = tog.closest('.admin-config-item-container');
                if(tog.find('.btn-primary').attr('did') == 'false'){
                    parent.find('input, select').prop('disabled', true);
                    parent.find('.btn-toggle[did!="enabled"] button').addClass('disabled');
                }else{
                    parent.find('input, select').prop('disabled', false);
                    parent.find('.btn-toggle[did!="enabled"] button').removeClass('disabled');
                }
            }
        },
        restartServer: function(e){
            e.preventDefault();
            GlobalEventDispatcher.generalEventPubSub.trigger('initRestart', {
                cb : function(){
                    window.location.href = '/admin';
                }
            });
        },
        togglePasswordContainer: function(e){
            var icon = $(e.currentTarget);
            var parent = icon.closest('.toggling-password-input');
            icon.addClass('hidden');
            if(icon.hasClass('glyphicon-eye-open')){
                parent.find('.glyphicon-eye-close').removeClass('hidden');
                parent.find('input').attr('type', 'text');
            }else{
                parent.find('.glyphicon-eye-open').removeClass('hidden');
                parent.find('input').attr('type', 'password');
            }
        },
        getProfile: function(cb){
            var me = this;
            AJAX('/rest/profile', 'GET', 'application/x-www-form-urlencoded', null, function(res, status, xhr){
                me.options.eventPubSub.trigger('setHeaderNavigation', res);
                cb();
            }, function(xhr, status, thrownError){
                me.options.eventPubSub.trigger('setHeaderNavigation');
                window.location.href = '/';
            });
        },
        setHeaderNavigation: function(params){
            var userIdentityDom = $('#user-identity');
            var userNav = $('#user-navigation');
            if(params){
                if(params.userType != 'admin'){
                    userNav.find('.admin-only-item').hide();
                }else{
                    userNav.find('.admin-only-item').show();
                }
                userNav.show('fast');
                $('#user-identity');
                $('#page-select');
            }else{
                userNav.hide();
                $('#user-identity').popover('hide');
                $('#page-select').popover('hide');
            }
            params = params || {};
            userIdentityDom.find('.placeholder-username').text(params.email || '');
            userIdentityDom.find('.placeholder-role').text(params.userType || '');
        }
    });
    return View;
});