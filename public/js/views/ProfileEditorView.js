define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: '#profile-editor',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initProfileEditor', function(profile){
                if(!profile){
                    Backbone.history.navigate('#/');
                }else{
                    me.profile = profile;
                    me.render();
                }
            });
        },
        events: {
            'click #profile-cancel' : 'render',
            'click #profile-save'   : 'saveChanges',
            'click #profile-delete' : 'deactivateAccount'
        },
        render: function(){
            var me = this;
            var template = _.template($('#ProfileEditorView').html(), {
                model : this.profile
            });
            me.$el.find('.page-view').html(template);
            return this;
        },
        // save form changes
        saveChanges: function(){
            var me = this;
            var profile = me.validate();
            if(profile){
                delete profile.userName;
                if(me.hasPassword()){
                    var password = me.validatePassword();
                    if(password){
                        me.updateProfile(profile, function(){
                            me.changePassword(password);
                        });
                    }
                }else{
                    me.updateProfile(profile);
                }
            }
        },
        // deactivate the current user
        deactivateAccount: function(){
            var me = this;
            Alerts.Confirm.display({
                title   : 'Confirm Account Deletion', 
                content : 'Are you sure you wish to delete your account?'
            }, function(){
                Backbone.history.navigate('#/logout');
            });
        },
        // update user profile on the server
        updateProfile: function(profile, callback){
            var me = this;
            me.options.mc.update('contacts', me.profile.attributes.magnetId, profile, function(){
                me.profile.set({
                    firstName   : profile.firstName,
                    lastName    : profile.lastName,
                    companyName : profile.companyName
                });
                me.options.cookies.create('magnet_auth', me.profile.attributes['eMails'][0]+'|'+me.profile.attributes.firstName+' '+me.profile.attributes.lastName+'|'+me.profile.attributes.companyName, 1);
                $('.user-username').html(me.profile.attributes.firstName+' '+me.profile.attributes.lastName);
                $('.user-company').html(me.profile.attributes.companyName == 'undefined' ? '' : me.profile.attributes.companyName);
                if(typeof callback == typeof Function){
                    callback();
                }else{
                    Alerts.General.display({
                        title   : 'Profile Updated Successfully', 
                        content : 'Your profile has been updated successfully.'
                    });
                }
            }, function(){
                Alerts.Error.display({
                    title   : 'Profile Could Not Be Updated', 
                    content : 'There were problems updating your profile. Please try again later.'
                });
            });
        },
        // change user's password
        changePassword: function(password){
            var me = this;
            var valid = false;
            password.authority = 'magnet';
            delete password['newPassword2'];
            me.options.mc.query('users/@me/changePassword', 'POST', password, function(){
                Alerts.General.display({
                    title   : 'Profile Updated Successfully', 
                    content : 'Your profile has been updated successfully.'
                });
                me.$el.find('.form-horizontal input[type="password"]').val('');
                valid = true;
            }, 'html', 'application/x-www-form-urlencoded', function(xhr, status, error){
                var res = utils.getValidJSON(xhr.responseText);
                if(res && res.message){
                    Alerts.Error.display({
                        title   : 'Password Could Not Be Updated', 
                        content : res.message
                    });
                }else{
                    Alerts.Error.display({
                        title   : 'Password Could Not Be Updated', 
                        content : 'There were problems updating your password. Please try again later.'
                    });
                }
                valid = false;
                me.$el.find('.form-horizontal input[type="password"]').val('');
            });
        },
        // validate user profile fields and return data if valid
        validate: function(){
            var invalid = [];
            var data = {};
            this.$el.find('.form-horizontal input[type="text"]').each(function(){
                if($.trim($(this).val()).length < 1 || $(this).val() == $(this).attr('placeholder')){
                    invalid.push($(this).attr('placeholder'));
                }
                data[$(this).attr('name')] = $(this).val();
            });
            if(invalid.length > 0){
                Alerts.Error.display({
                    title   : 'Required Field(s) Missing', 
                    content : 'The following fields are required and must be filled out: <br /><br />' + invalid.join('<br />') + '<br /><br />'
                });
                return false;
            }else{
                return data;
            }
        },
        // check if user is attempting to change password
        hasPassword: function(){
            var isset = true;
            this.$el.find('.form-horizontal input[type="password"]').each(function(){
                if($.trim($(this).val()).length < 1){
                    isset = false;
                }
            });
            return isset;
        },
        // validate user password fields and return data if valid
        validatePassword: function(){
            var password = {};
            var valid = true;
            this.$el.find('.form-horizontal input[type="password"]').each(function(){
                password[$(this).attr('name')] = $(this).val();
            });
            if(valid){
                if(password['newPassword'] != password['newPassword2']){
                    Alerts.Error.display({
                        title   : 'Password Doesn\'t Match',
                        content : 'The re-typed password doesn\'t match the original.'
                    });
                    return false;
                }else{
                    return password;
                }
            }else{
                return false;
            }
        }
    });
    return View;
});