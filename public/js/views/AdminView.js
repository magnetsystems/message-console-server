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
                if(page == 'actions') me.getConfig();
                if(page == 'announcements') me.startAnnouncements();
                if(page == 'cms') me.getPageList();
                me.selectedPage = {};
                $('#cms-folder-span, #cms-filename-span').text('');
            });
        },
        // metadata for admin views
        pages: {
            'users' : {
                col      : UserCollection,
                headers  : {
                    createdAt : 'Created On',
                    email     : 'Email Address',
                    firstName : 'First Name',
                    lastName  : 'Last Name',
                    userType  : 'Type of User'
                },
                searchBy : 'name',
                sortDefault : {
                    property : 'createdAt',
                    order    : 'desc'
                }
            },
            'invites' : {
                col      : UserCollection,
                headers  : {
                    createdAt : 'Created On',
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
                },
                sortDefault : {
                    property : 'createdAt',
                    order    : 'desc'
                }
            },
            'requests' : {
                col      : UserCollection,
                headers  : {
                    createdAt : 'Created On',
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
                },
                sortDefault : {
                    property : 'createdAt',
                    order    : 'desc'
                }
            },
            'invitations' : {
                col      : UserCollection,
                headers  : {
                    createdAt    : 'Created On',
                    invitedEmail : 'Email Address',
                    userType     : 'Type of User'
                },
                searchBy : 'invitedEmail',
                data     : {
                    search : [{
                        'userType' : 'invited'
                    }]
                },
                sortDefault : {
                    property : 'createdAt',
                    order    : 'desc'
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
            'click #update-configuration': 'updateConfig',
            'click #clear-search-indexes': 'clearIndexes',
            'click #update-search-indexes': 'updateIndexes',
            'click .attachment-link' : 'showLog',
            'click .cmspage' : 'selectPage',
            'click .cms-button' : 'startCMSEdit',
            'click .cms-editing-button' : 'endCMSEdit'
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
            var me = this;
            var input = $('#invited-user-email');
            var parent = $('#app-management-container');
            me.showLoading(parent);
            me.options.eventPubSub.trigger('getUserIdentity', function(user){
                me.options.mc.query('adminInviteUser', 'POST', {
                    email   : input.val()
                }, function(){
                    me.hideLoading(parent);
                    me.options.eventPubSub.trigger('refreshListView');
                    Alerts.General.display({
                        title   : 'Invitation Sent Successfully', 
                        content : 'Your invitation email to '+input.val()+' has been sent successfully.'
                    });
                    input.val('');
                }, 'json', 'application/x-www-form-urlencoded', function(xhr, status, error){
                    me.hideLoading(parent);
                    Alerts.Error.display({
                        title   : 'Invitation Not Sent',
                        content : 'There was a problem sending the invitation: '+xhr.responseText
                    });
                });
            });
        },
        hideLoading: function(parent){
            if(!parent) return false;
            parent.find('.buttons-section').show();
            parent.find('.buttons-section.loading').hide();
        },
        showLoading: function(parent){
            parent.find('.buttons-section').hide();
            parent.find('.buttons-section.loading').show();
        },
        // get app configuration
        getConfig: function(){
            this.options.mc.query('configs', 'GET', null, function(data){
                if(data){
                    $('#skipAdminApproval option').eq(data.skipAdminApproval === true ? 1 : 0).prop('selected', true);
                    $('#homePageVideoID').val(data.homePageVideoID);
                }
            });
        },
        // start announcements
        startAnnouncements: function(){
            this.options.eventPubSub.trigger('initAnnouncementsView');
        },
        // get CMS pages
        getPageList: function(){
            var me = this;
            var parent = $('#cms-menu');
            $('#cms-content, #cms-actions').hide();
            $('#cms-editable-section').hide();
            me.resetButtons();
            me.showLoading(parent);
            me.options.mc.query('views', 'GET', {}, function(res){
                me.hideLoading(parent);
                me.cmsPages = res;
                parent.html(_.template($('#CMSListView').html(), {
                    col : res
                }));
            }, null, null, function(xhr, status, error){
                me.hideLoading(parent);
            });
            me.retrieveCMSPage(null, {
                folder   : 'layouts',
                filename : 'site'
            }, function(data){
                me.CMSLayout = data;
            });
        },
        resetButtons: function(){
            $('.cms-button').show();
            $('.cms-editing-button').hide();
        },
        retrieveCMSPage: function(parent, page, callback){
            var me = this;
            me.resetButtons();
            me.options.mc.query('getView', 'POST', {
                folder    : page.folder,
                filename  : page.filename,
                isPreview : parent ? false : true
            }, function(data){
                me.hideLoading(parent);
                callback(data);
            }, null, null, function(){
                me.hideLoading(parent);
            });
        },
        selectPage: function(e){
            e.preventDefault();
            var item = $(e.currentTarget);
            $('#cms-preview').height($(window).height() - 40);
            var parent = $('#cms-content');
            var me = this;
            var folder = item.attr('folder');
            var filename = item.attr('filename');
            me.selectedPage = {
                folder   : (folder && folder != '') ? folder : undefined,
                filename : filename
            };
            me.closeEditor();
            me.showLoading(parent);
            me.retrieveCMSPage(parent, me.selectedPage, function(data){
                me.selectedPage.data = data;
                $('#cms-content, #cms-actions').show();
                $('#cms-content-title-span').text((me.selectedPage.folder ? me.selectedPage.folder+'/' : '')+me.selectedPage.filename);
                me.setPreview();
            });
        },
        setPreview: function(data){
            data = data || this.selectedPage.data;
            if(this.getLayoutType() !== true){
                data = this.CMSLayout.replace('~~~Magnet_Layout_Body~~~', data);
            }
            $('#cms-preview').squirt(data.replace(/{{(.*?)}}/gm, ''));
            $('.lightbox, .lightboxOverlay').remove();
        },
        startCMSEdit: function(e){
            e.preventDefault();
            var me = this;
            $('#cms-editable-section').show('fast', function(){
                me.openEditor();
            });
        },
        openEditor: function(){
            this.editor = ace.edit('cms-editable-section');
            this.editor.setValue(this.selectedPage.data, 1);
            this.editor.setTheme('ace/theme/chrome');
            this.editor.getSession().setMode('ace/mode/html');
            $('#cms-preview, #cms-editable-section').height(($(window).height() / 2) - 40);
            $('#cms-preview').css('border-radius', '0 0 10px 10px');
            $('.cms-button').hide();
            $('.cms-editing-button').show();
        },
        endCMSEdit: function(e){
            e.preventDefault();
            var item = $(e.currentTarget);
            var action = item.attr('did');
            var data = this.editor.getValue();
            if(action == 'preview'){
                this.setPreview(data);
            }else{
                if(action == 'save'){
                    this.selectedPage.data = data;
                    this.updateCMSPage(this.selectedPage);
                }
                this.setPreview(this.selectedPage.data);
                this.closeEditor();
                this.resetButtons();
            }
        },
        closeEditor: function(){
            if(this.editor){
                this.editor.destroy();
                this.editor = undefined;
                $('#cms-editable-section').replaceWith('<div id="cms-editable-section" style="display:none"></div>');
                $('#cms-preview').height($(window).height() - 40);
                $('#cms-preview').css('border-radius', '10px');
            }
        },
        updateCMSPage: function(page){
            var me = this;
            var parent = $('#cms-content');
            me.resetButtons();
            me.options.mc.query('updateView', 'POST', page, function(){
                me.hideLoading(parent);
                Alerts.General.display({
                    title   : 'Page Updated Successfully',
                    content : 'The page you selected has been updated successfully.'
                });
            }, null, null, function(){
                me.hideLoading(parent);
            });
        },
        getLayoutType: function(){
            var status;
            for(var i=this.cmsPages.length;i--;)
                if((typeof this.selectedPage.folder === 'undefined' || this.cmsPages[i].folder === this.selectedPage.folder) && this.cmsPages[i].filename === this.selectedPage.filename)
                    status = this.cmsPages[i].noLayout;
            return status;
        },
        // update configuration
        updateConfig: function(){
            var me = this;
            var parent = $('#app-management-container');
            me.showLoading(parent);
            me.options.mc.query('configs', 'PUT', {
                skipAdminApproval : ($('#skipAdminApproval').val() === 'true'),
                homePageVideoID   : $.trim($('#homePageVideoID').val())
            }, function(){
                me.hideLoading(parent);
                Alerts.General.display({
                    title   : 'Config Updated Successfully',
                    content : 'App configuration has been updated successfully.'
                });
            }, null, null, function(xhr, status, error){
                me.hideLoading(parent);
                Alerts.Error.display({
                    title   : 'Error Sending Request',
                    content : xhr.responseText
                });
            });
        },
        // clear search indexes
        clearIndexes: function(){
            var me = this;
            var parent = $('#app-management-container');
            me.showLoading(parent);
            me.options.mc.query('search/clearIndexes', 'POST', null, function(){
                me.hideLoading(parent);
                Alerts.General.display({
                    title   : 'Search Indexes Cleared',
                    content : 'The search indexes have have been cleared successfully.'
                });
            }, null, null, function(xhr, status, error){
                me.hideLoading(parent);
                Alerts.Error.display({
                    title   : 'Error Sending Request',
                    content : xhr.responseText
                });
            });
        },
        // update search indexes
        updateIndexes: function(){
            var me = this;
            var parent = $('#app-management-container');
            me.showLoading(parent);
            me.options.mc.query('search/updateIndexes', 'POST', null, function(){
                me.hideLoading(parent);
                Alerts.General.display({
                    title   : 'Search Indexes Updated',
                    content : 'The search indexes have have been updated successfully.'
                });
            }, null, null, function(xhr, status, error){
                me.hideLoading(parent);
                Alerts.Error.display({
                    title   : 'Error Sending Request',
                    content : xhr.responseText
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