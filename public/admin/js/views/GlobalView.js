define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: "body",
        initialize: function(options){
            var me = this;
            me.options = options;
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
            'click #user-panel-toggle': 'toggleUserPanel',
            'click .btn-toggle button': 'toggleSwitch'
        },
        goBack: function(e){
            e.preventDefault();
            window.history.back();
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
            var location = params.redirectPort ? (window.location.host.indexOf(':') != -1 ? window.location.protocol+'//'+window.location.host.replace(':'+window.location.port, ':'+params.redirectPort) : '') : '';
            var tick = function(next, done){
                if(location !== ''){
                    params.location = location+'/admin';
                    pingHost(location, done, next);
                }else{
                    AJAX('/admin/beacon.json', 'GET', 'text/plain', null, function(){
                        done();
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
        }
    });
    return View;
});