define(['jquery', 'backbone'], function($, Backbone){
    var View = Backbone.View.extend({
        el: '#mgmt-users',
        initialize: function(options){
            var me = this;
            me.options = options;
            me.options.eventPubSub.bind('initAccountsView', function(params){
                me.selectedElements = [];
                me.render();
                if(params.hasEmail)
                    me.$el.find('.glyphicon-envelope').removeClass('disabled');
                else
                    me.$el.find('.glyphicon-envelope').addClass('disabled');
            });
            me.sendInviteModal = $('#mgmt-sendinvite-modal');
            me.sendInviteBtn = $('#mgmt-accounts-sendinvite-btn');
            me.sendInviteBtn.click(function(){
                if(me.sendInviteBtn.hasClass('disabled')) return;
                me.sendInvite();
            });
            me.createUserModal = $('#new-user-modal');
            me.createUserBtn = $('#mgmt-accounts-create-btn');
            me.createUserBtn.click(function(){
                if(me.createUserBtn.hasClass('disabled')) return;
                me.createUser();
            });
        },
        events: {
            'click #mgmt-accounts-show-create-modal-btn': 'showCreate',
            'click #mgmt-accounts-show-sendinvite-modal-btn': 'showSendInvite',
            'change .repeater-header-left select[name="searchby"]': 'changeSearchBy',
            'click .mgmt-account-list-refresh-btn': 'refresh'
        },
        render: function(){
            var me = this;
            me.sorts = {};
            if(me.rendered) return me.refresh();
            me.rendered = true;
            me.$el.find('.view-container').html(_.template($('#AccountsListTmpl').html(), {
                filters  : me.filters
            }));
            me.list = $('#mgmt-accounts-list');
            me.list.repeater({
                dataSource       : function(options, cb){
                    me.buildList(options, cb)
                },
                list_selectable  : false,
                list_noItemsHTML : '',
                stretchHeight    : false
            });
        },
        refresh: function(){
            this.list.repeater('render');
        },
        filters : {
            email : {
                title : 'Email Address',
                type  : 'search'
            },
            firstName : {
                title : 'First Name',
                type  : 'search'
            },
            lastName : {
                title : 'Last Name',
                type  : 'search'
            },
            userType : {
                title : 'Type of User',
                type  : 'search'
            }
        },
        changeSearchBy: function(e){
            utils.changeSearchBy(this, $(e.currentTarget).val());
        },
        retrieve: function(options, cb){
            var me = this;
            var filters = utils.collectFilters(me.$el);
            var params = {};
            for(var i=0;i<filters.length;++i){
                params = typeof filters[i].val == 'object' ? filters[i].val : {search : filters[i].val};
                params.searchby = filters[i].name;
            }
            var query = {};
            if(options.pageIndex && options.pageIndex !== 0) query['_magnet_page'] = options.pageIndex !== 0 ? (options.pageSize * options.pageIndex) : 1;
            if(options.pageSize != 10) query['_magnet_page_size'] = options.pageSize || 10;
            if(params.search || options.search) query[params.searchby] = params.search || options.search;
            if(options.sortDirection && options.sortProperty){
                me.sorts = {
                    sortby    : options.sortProperty,
                    sortorder : options.sortDirection,
                    index     : utils.getIndexByAttr(me.columns, 'property', options.sortProperty)
                };
                query['_magnet_'+(options.sortDirection == 'asc' ? 'ascending' : 'descending')] = options.sortProperty;
            }
            var qs = '';
            for(var key in query){
                qs += '&'+key+'='+query[key];
            }
            qs = qs.replace('&', '?');
            AJAX('users'+qs, 'GET', 'application/json', null, function(res, status, xhr){
                me.users = [];
                if(res && res.rows){
                    for(var i=0;i<res.rows.length;++i){
                        res.rows[i].id = res.rows[i].magnetId;
                        res.rows[i].details = '<a href="#/users/'+res.rows[i].magnetId+'">More Info</a>';
                        if(res.rows[i].createdAt) res.rows[i].createdAt = moment(res.rows[i].createdAt).format('lll');
                    }
                    me.users = res.rows;
                }
                cb(res);
            }, function(xhr, status, thrownError){
                alert(xhr.responseText);
            });
        },
        buildList: function(options, callback){
            var me = this;
            me.retrieve(options, function(res){
                var data = {
                    count   : res.paging.total,
                    items   : res.rows,
                    page    : (res.paging.start / options.pageSize),
                    columns : me.columns
                };
                data.pages = Math.ceil(data.count / options.pageSize);
                data.start = data.page * options.pageSize;
                data.end = data.start + options.pageSize;
                data.end = (data.end <= data.count) ? data.end : data.count;
                data.start = data.start + 1;
                setTimeout(function(){
                    $('#mgmt-accounts-list .repeater-list-header tr').addClass('head').detach().prependTo('#mgmt-accounts-list .repeater-list-items tbody');
                    if(!$.isEmptyObject(me.sorts)){
                        $('#mgmt-accounts-list .repeater-list-items tbody tr:first td').each(function(i){
                            var td = $(this);
                            var glyph = 'glyphicon';
                            if(me.sorts.index === i){
                                td.addClass('sorted');
                                if(me.sorts.sortorder == 'asc'){
                                    td.find('.'+glyph).removeClass(glyph+'-chevron-down').addClass(glyph+'-chevron-up');
                                }else{
                                    td.find('.'+glyph).removeClass(glyph+'-chevron-up').addClass(glyph+'-chevron-down');
                                }
                            }
                        });
                    }
                    $('#mgmt-accounts-list').find('img').tooltip();
                }, 20);
                callback(data);
            });
        },
        columns: [
            {
                label    : 'Created',
                property : 'createdAt',
                sortable : true
            },
            {
                label    : 'Email Address',
                property : 'email',
                sortable : true
            },
            {
                label    : 'First Name',
                property : 'firstName',
                sortable : true
            },
            {
                label    : 'Last Name',
                property : 'lastName',
                sortable : true
            },
            {
                label    : 'Type of User',
                property : 'userType',
                sortable : true
            },
            {
                label    : 'Details',
                property : 'details',
                sortable : false
            }
        ],
        validateInviteModal: function(dom, obj, isEdit){
            if($.trim(obj.email).length < 1 && !isEdit){
                utils.showError(dom, 'email', 'Invalid Email. Email is a required field.');
                return false;
            }else if(!utils.isValidEmail(obj.email) && !isEdit){
                utils.showError(dom, 'email', 'Invalid Email. The Email Address field must contain a valid email address.');
                return false;
            }
            return true;
        },
        showSendInvite: function(e){
            var me = this;
            if($(e.currentTarget).hasClass('disabled')) return;
            var template = _.template($('#SendInviteView').html());
            me.sendInviteModal.find('.modal-body').html(template);
            var userNameDom = me.sendInviteModal.find('input[name="email"]');
            me.sendInviteModal.find('input').keyup(function(){
                utils.resetError(userNameDom.closest('.form-group'));
                if(me.validateInviteModal(me.sendInviteModal, utils.collect(me.sendInviteModal))){
                    me.sendInviteBtn.removeClass('disabled');
                    utils.resetError(me.sendInviteModal);
                }else{
                    me.sendInviteBtn.addClass('disabled');
                }
            });
            me.sendInviteModal.modal('show');
        },
        sendInvite: function(){
            var me = this;
            var obj = utils.collect(me.sendInviteModal);
            utils.resetError(me.sendInviteModal);
            if(!me.validateInviteModal(me.sendInviteModal, obj))
                return;
            me.options.eventPubSub.trigger('btnLoading', me.sendInviteBtn);
            AJAX('adminInviteUser', 'POST', 'application/json', obj, function(){
                me.sendInviteModal.modal('hide');
                me.users.push(obj);
                me.list.repeater('render');
                Alerts.General.display({
                    title   : 'Invitation Sent Successfully',
                    content : 'Your invitation email to '+obj.email+' has been sent successfully.'
                });
            }, function(e){
                var msg = 'There was a problem sending the invitation: '+e;
                if(e == 'email-disabled')
                    msg = 'The <b>Email</b> feature has not been enabled in the Configuration page, so the user cannot be invited. If you would like to create an account without going through the email confirmation process, use the <b>Add Account</b> feature.';
                if(e == 'error-sending-email')
                    msg = 'There was an error sending out the email, so the invitation could not be completed. Check your email configuration in the <b>Email</b> section of the Configuration page. If you would like to create an account without going through the email confirmation process, use the <b>Add Account</b> feature.';
                if(e == 'USER_ALREADY_EXISTS')
                    msg = 'The email address you specified has already been sent an email invite.';
                Alerts.Error.display({
                    title   : 'Invitation Not Sent',
                    content : msg
                });
            }, null, {
                btn : me.sendInviteBtn
            });
        },
        validateUserModal: function(dom, obj, isEdit){
            if(obj.firstName && !/^[a-zA-Z]+$/i.test(obj.firstName) && !isEdit){
                utils.showError(dom, 'firstName', 'Invalid First Name. The First Name field must only contain letters.');
                return false;
            }else if(obj.lastName && !/^[a-zA-Z]+$/i.test(obj.lastName) && !isEdit){
                utils.showError(dom, 'lastName', 'Invalid Last Name. The Last Name field must only contain letters.');
                return false;
            }else if($.trim(obj.email).length < 1 && !isEdit){
                utils.showError(dom, 'email', 'Invalid Email. Email is a required field.');
                return false;
            }else if(!utils.isValidEmail(obj.email) && !isEdit){
                utils.showError(dom, 'email', 'Invalid Email. The Email Address field must contain a valid email address.');
                return false;
            }else if($.trim(obj.password.length) < 1 && !isEdit){
                utils.showError(dom, 'password', 'Invalid Password. Password is a required field.');
                return false;
            }
            return true;
        },
        showCreate: function(){
            var me = this;
            var template = _.template($('#CreateAccountView').html());
            me.createUserModal.find('.modal-body').html(template);
            var userNameDom = me.createUserModal.find('input[name="email"]');
            me.createUserModal.find('input').keyup(function(){
                utils.resetError(me.createUserModal.find('.modal-body'));
                if(me.validateUserModal(me.createUserModal, utils.collect(me.createUserModal))){
                    me.createUserBtn.removeClass('disabled');
                    utils.resetError(me.createUserModal);
                }else{
                    me.createUserBtn.addClass('disabled');
                }
            });
            me.createUserModal.modal('show');
        },
        createUser: function(){
            var me = this;
            var obj = utils.collect(me.createUserModal);
            utils.resetError(me.createUserModal);
            if(!me.validateUserModal(me.createUserModal, obj))
                return;
            me.options.eventPubSub.trigger('btnLoading', me.createUserBtn);
            AJAX('users', 'POST', 'application/json', obj, function(){
                me.createUserModal.modal('hide');
                me.users.push(obj);
                me.list.repeater('render');
                Alerts.General.display({
                    title   : 'Account Created',
                    content : 'A new account with email of "'+obj.email+'" has been created.'
                });
            }, function(xhr){
                Alerts.Error.display({
                    title   : 'Error Creating Account',
                    content : 'An account with the email <b>'+obj.email+'</b> already exists.'
                });
            }, null, {
                btn : me.createUserBtn
            });
        }
    });
    return View;
});