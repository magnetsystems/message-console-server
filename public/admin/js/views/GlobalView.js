define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: "body",
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind("btnLoading", function(btn){
                btn.attr('txt', btn.html()).html('Loading..').addClass('disabled');
            });
            me.options.eventPubSub.bind("btnComplete", function(btn){
                btn.html(btn.attr('txt')).removeClass('disabled');
            });
            me.options.eventPubSub.bind('resetPages', function(page){
                me.selectPage(page);
            });
            me.options.eventPubSub.bind('resetAdminPages', function(page){
                me.selectPage(page, '.page');
            });
            GlobalEventDispatcher.generalEventPubSub = _.extend({}, Backbone.Events);
            GlobalEventDispatcher.generalEventPubSub.bind('initRestart', function(params){
                me.handleRestart(params);
            });
        },
        events: {
            'click .goBack': 'goBack',
            'click .btn-logout': 'logout',
            'click #user-panel-toggle': 'toggleUserPanel'
        },
        goBack: function(e){
            e.preventDefault();
            window.history.back();
        },
        logout: function(){
            var me = this;
            $('.modal_errors').hide();
            $.ajax({
                type        : 'POST',
                url         : '/rest/logout',
                dataType    : 'html',
                contentType : 'application/x-www-form-urlencoded'
            }).done(function(result, status, xhr){
                me.cookies.remove('magnet_auth');
                window.location.href = '/login/';
            });
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
        handleRestart: function(params){
            var me = this;
            params = params || {};
            var tick = function(next, done){
                AJAX('/admin/beacon.json', 'GET', 'text/plain', null, function(){
                    done();
                }, function(){
                    next();
                }, null, {
                    redirectHost : (me.options.opts.restartParams && me.options.opts.restartParams.redirectPort) ? (window.location.host.indexOf(':') != -1 ? window.location.host.replace(':'+window.location.port, ':'+me.options.opts.restartParams.redirectPort) : '') : null
                });
            };
            AJAX('restart', 'POST', 'application/json', null, function(res){
                me.serverRestartModal('restart-modal', tick, params);
            }, function(e){
                me.serverRestartModal('restart-modal', tick, params);
            });
        },
        serverRestartModal: function(sel, tick, params){
            var me = this;
            var progress = 0;
            var modal = $('#'+sel);
            var dom = modal.find('.progress-bar');
            dom.attr('aria-valuenow', 100);
            dom.css('width', '100%');
            modal.modal('show');
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
                clearInterval(prog);
                if(typeof params.cb === typeof Function) params.cb();
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
        }
    });
    return View;
});