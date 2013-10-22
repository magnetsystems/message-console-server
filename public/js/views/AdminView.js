define(['jquery', 'backbone', 'collections/UserCollection', 'collections/EventCollection'], function($, Backbone, UserCollection, EventCollection){
    var View = Backbone.View.extend({
        el: "#admin",
        initialize: function(){
            var me = this;
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
            });
        },
        // metadata for admin views
        pages: {
            'users' : {
                col      : UserCollection,
                headers  : {
                    email     : 'Email Address',
                    firstName : 'First Name',
                    lastName  : 'Last Name',
                    userType  : 'Type of User'
                },
                searchBy : 'name'
            },
            'invites' : {
                col      : UserCollection,
                headers  : {
                    email     : 'Email Address',
                    firstName : 'First Name',
                    lastName  : 'Last Name',
                    userType  : 'Type of User'
                },
                searchBy : 'name',
                data     : {
                    search : [{
                        'userType' : 'approved'
                    }]
                }
            },
            'requests' : {
                col      : UserCollection,
                headers  : {
                    email     : 'Email Address',
                    firstName : 'First Name',
                    lastName  : 'Last Name',
                    userType  : 'Type of User'
                },
                searchBy : 'name',
                data     : {
                    search : [{
                        'userType' : 'guest'
                    }]
                }
            },
            'invitations' : {
                col      : UserCollection,
                headers  : {
                    invitedEmail : 'Email Address',
                    userType     : 'Type of User'
                },
                searchBy : 'invitedEmail',
                data     : {
                    search : [{
                        'userType' : 'invited'
                    }]
                }
            },
            'events' : {
                col      : EventCollection,
                headers  : {
                    createdAt : 'Created On',
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
            'click .attachment-link' : 'showLog'
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
        // send invitation to a user 
        sendInvitation: function(){
            var input = $('#invited-user-email');
            var me = this;
            var parent = input.closest('.tab-pane');
            parent.find('.buttons-section').hide();
            parent.find('.buttons-section.loading').show();
            me.options.eventPubSub.trigger('getUserIdentity', function(user){
                me.options.mc.query('adminInviteUser', 'POST', {
                    email   : input.val()
                }, function(){
                    parent.find('.buttons-section').show();
                    parent.find('.buttons-section.loading').hide();
                    me.options.eventPubSub.trigger('refreshListView');
                    Alerts.General.display({
                        title   : 'Invitation Sent Successfully', 
                        content : 'Your invitation email to '+input.val()+' has been sent successfully.'
                    });
                    input.val('');
                }, 'json', 'application/x-www-form-urlencoded', function(xhr, status, error){
                    parent.find('.buttons-section').show();
                    parent.find('.buttons-section.loading').hide();
                    Alerts.Error.display({
                        title   : 'Invitation Not Sent',
                        content : 'There was a problem sending the invitation: '+xhr.responseText
                    });
                });
            });
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
        }
    });
    return View;
});