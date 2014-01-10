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
            var title = $('.title_container');
            var menu = title.find('.dropdown-menu');
            title.find('.dropdown').unbind('mouseenter').mouseenter(function(){
                menu.css('display', 'block');
            }).unbind('mouseleave').mouseleave(function(){
                menu.css('display', 'none');
            });
            me.bindFeedbackButton();
            $('.page').append('<div class="footer clearfix"><a href="http://www.magnet.com/resources/tos.html">Terms of Service</a> | <a href="http://www.magnet.com/resources/privacy_policy.html">Privacy Policy</a><br />&copy; 2013 Magnet Systems, Inc. All rights reserved.</div>');
        },
        events: {
            'click .goBack': 'goBack',
            'click #user-panel-toggle': 'toggleUserPanel'
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
        // find transition method for the currently selected view into the next view
        selectPage: function(page){
            var pages = $('.page');
            $('#user-panel').slideUp('fast');
            var curr = pages.not('.hidden');
            var cid = curr.attr('id');
            var me = this;
            var hasTransition = false;
            $.each(this.transitions, function(id, view){
                if(id == cid){
                    $.each(view, function(i, transition){
                        if(page == transition.to){
                            me.slideTransition({
                                from  : curr,
                                to    : $('#'+page),
                                slide : transition.slide
                            });
                            hasTransition = true;
                        }
                    });
                }
            });
            if(!hasTransition){
                pages.addClass('hidden');
                if(page){
                    $('#'+page).removeClass('hidden').css('left', '');
                }
            }
        },
        // slide view to the left or right depending on the source view and destination view
        slideTransition: function(params){
            var me = this;
            var wWidth = $(window).width();
            var anim = {};
            $('html').css('overflow-x', 'hidden');
            $('body').scrollTo(0, 500);
            anim['left'] = params.slide == 'left' ? '-' + wWidth + 'px' : wWidth + 'px';
            params.from.animate(anim, 500, function(){
                params.from.addClass('hidden');
                $('html').css('overflow-x', 'auto');
            });
            params.to.css('left', params.slide == 'left' ? wWidth + 'px' : '-' + wWidth + 'px');
            params.to.removeClass('hidden');
            var anim2 = {};
            anim2['left'] = '0px';
            params.to.animate(anim2, 500);
        },
        // a map of view transitions
        transitions: {
            'project-wizard' : [
                {to : 'project-manager', slide : 'right'}, 
                {to : 'project-assets', slide : 'left'}
            ],
            'project-manager' : [
                {to : 'project-wizard', slide : 'left'}, 
                {to : 'project-assets', slide : 'left'},
                {to : 'sandbox', slide : 'left'}
            ],
            'project-assets' : [
                {to : 'project-manager', slide : 'right'},
                {to : 'project-wizard', slide : 'right'},
                {to : 'sandbox', slide : 'left'}

            ],
            'sandbox' : [
                {to : 'project-manager', slide : 'right'},
                {to : 'project-wizard', slide : 'right'},
                {to : 'project-assets', slide : 'right'}
            ]
        },
        bindFeedbackButton : function(){
            var div = $('#feedback-content');
            var complete = $('#feedback-complete');
            var error = $('#feedback-error');
            var btn = $('#feedback-btn');
            var submitBtn = $('#submit-feedback-btn');
            var loader = $('#feedback-content img');
            var isActive = false;
            var closed = {
                height  : 0,
                width   : 0,
                padding : 0,
                opacity : 0
            };
            div.each(function(){
                $.data(this, 'baseHeight', $(this).height());
                $.data(this, 'baseWidth', $(this).width());
                $('#leave-feedback-container').css('opacity', '1');
            }).css(closed);
            btn.toggle(function(){
                complete.hide('slow');
                error.hide('slow');
                div.animate({
                    height  : div.data('baseHeight'),
                    width   : div.data('baseWidth'),
                    padding : '10px',
                    opacity : 1
                }, 600);
            }, function(){
                complete.hide('slow');
                error.hide('slow');
                div.animate(closed, 600);
            });
            submitBtn.click(function(){
                var type = $('#feedback-type-field');
                var sub = $('#feedback-subject');
                var msg = $('#feedback-message');
                if(isActive === false && $.trim(msg.val()).length > 0){
                    isActive = true;
                    submitBtn.hide();
                    loader.show();
                    $.ajax({
                        type        : 'POST',
                        url         : '/rest/submitFeedback',
                        data        : {
                            type : type.val(),
                            msg  : msg.val(),
                            sub  : sub.val()
                        },
                        contentType : 'application/x-www-form-urlencoded'
                    }).done(function(){
                        complete.show('slow');
                    }).fail(function(){
                        error.show('slow');
                    }).always(function(){
                        msg.val('');
                        sub.val('');
                        div.css(closed);
                        isActive = false;
                        submitBtn.show();
                        loader.hide();
                    });
                }
            });
        }
        /*
        mobilize: function(){
            if($(window).width() < 900){
                $('.page').not('#login-container').css('top', '125px');
                $('.title_container').addClass('hidden');
                $('.title_container_mobile').removeClass('hidden');
            }else{
                $('.page').not('#login-container').css('top', '76px');
                $('.title_container').removeClass('hidden');
                $('.title_container_mobile').addClass('hidden');
            }
            $(window).resize(function(){
                if($(window).width() < 900){
                    $('.page').not('#login-container').css('top', '125px');
                    $('.title_container').addClass('hidden');
                    $('.title_container_mobile').removeClass('hidden');
                }else{
                    $('.page').not('#login-container').css('top', '76px');
                    $('.title_container').removeClass('hidden');
                    $('.title_container_mobile').addClass('hidden');
                }
            });
        }
        */
    });
    return View;
});