define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: '#user-profile-modal',
        initialize: function(options){
            var me = this;
            me.options = options;
            me.modal = $('#user-profile-modal');
            me.updateProfileBtn = $('#user-profile-update-btn');
            me.options.eventPubSub.bind('initProfile', function(){
                me.getProfile(function(data){
                    me.render(data);
                    me.modal.modal('show');
                });
            });
        },
        events: {
            'click #user-profile-update-btn': 'saveProfile',
            'keyup .password-inputs input': 'validatePassword'
        },
        getProfile: function(cb){
            AJAX('/rest/profile', 'GET', 'application/x-www-form-urlencoded', null, function(res, status, xhr){
                cb(res);
            }, function(xhr, status, thrownError){
                alert(xhr.responseText);
            });
        },
        render: function(data){
            var template = _.template($('#ProfileTmpl').html(), {
                model  : data
            });
            this.modal.find('.modal-body').html(template);
        },
        saveProfile: function(){
            var me = this;
            var data = utils.collect(me.$el.find('.modal-body'));
            if(me.hasPassword(data) && data.newpassword != data.newpassword2){
                return Alerts.Error.display({
                    title   : 'Password Doesn\'t Match',
                    content : 'The re-typed password doesn\'t match the original.'
                });
            }
            delete data.userName;
            AJAX('/rest/profile', 'PUT', 'application/x-www-form-urlencoded', data, function(res, status, xhr){
                me.$el.find('.password-inputs input').val('');
                me.modal.modal('hide');
                Alerts.General.display({
                    title   : 'Profile Updated',
                    content : 'Your user profile has been updated successfully.'
                });
            }, function(e, status, thrownError){
                var msg;
                switch(e){
                    case 'validation-error': msg = 'The account you are attempting to update is' +
                        ' the only active admin. If you block this account or change the user type to "developer", you will not be able to log in.'; break;
                    case 'old-pass-not-match': msg = 'The Current Password you specified did not match our records.'; break;
                    default: msg = 'An error has occurred during profile update. Please contact an administrator for assistance.'; break;
                }
                Alerts.Error.display({
                    title   : 'Profile Update Error',
                    content : msg
                });
            });
        },
        hasPassword: function(data){
            return ($.trim(data.oldpassword).length !== 0) || ($.trim(data.newpassword).length !== 0 || $.trim(data.newpassword2).length !== 0);
        },
        validatePassword: function(){
            var dom = this.$el.find('.modal-body');
            var pwdInputs = this.$el.find('.password-inputs .col-sm-6 input');
            utils.resetError(dom);
            var p0 = $('.password-inputs input[name="oldpassword"]').val();
            var p1 = $('.password-inputs input[name="newpassword"]').val();
            var p2 = $('.password-inputs input[name="newpassword2"]').val();
            if(!$.trim(p0).length){
                pwdInputs.prop('disabled', true);
            }else{
                pwdInputs.prop('disabled', false);
            }
            if($.trim(p0).length && $.trim(p1).length && $.trim(p1).length < 4){
                utils.showError(dom, 'newpassword', 'Password must be at least four characters.', true);
                this.updateProfileBtn.addClass('disabled');
            }else if($.trim(p0).length && $.trim(p1).length > 3 && $.trim(p2).length > 3 && p1 !== p2){
                utils.showError(dom, 'newpassword2', 'New password does not match.', true);
                this.updateProfileBtn.addClass('disabled');
            }else if($.trim(p0).length && $.trim(p1).length < 4 || $.trim(p2).length < 4){
                this.updateProfileBtn.addClass('disabled');
            }else{
                utils.resetError(dom);
                this.updateProfileBtn.removeClass('disabled');
            }
        }
    });
    return View;
});