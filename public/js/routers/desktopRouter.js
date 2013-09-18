define(['jquery', 'backbone','views/AlertGeneralView','views/AlertConfirmView','views/AlertErrorView','views/GlobalView','views/SandboxView','views/ProjectManagerView','views/ProjectWizardView','views/ProjectAssetsView','views/ProfileEditorView','collections/UserCollection','models/UserModel'], function($, Backbone, AlertGeneralView, AlertConfirmView, AlertErrorView, GlobalView, SandboxView, ProjectManagerView, ProjectWizardView, ProjectAssetsView, ProfileEditorView, UserCollection, UserModel){
    // bind alerts
    Alerts.General = new AlertGeneralView();
    Alerts.Confirm = new AlertConfirmView();
    Alerts.Error = new AlertErrorView();
    // main router
    var Router = Backbone.Router.extend({
        initialize: function(){
            var me = this;
            // establish event pub/sub 
            this.eventPubSub = _.extend({}, Backbone.Events);
            this.cookies = new Cookie();
            // session timeout notification is disabled
            this.sessionMgr = new SessionManager(this.cookies);
            $(document).ajaxComplete(function(e, xhr){
                if(xhr.status == 278){
                    window.location.href = '/login/';
                }else{
                    me.sessionMgr.reset();
                }
            });
            // init HTTP request methods
            this.httpreq = new HTTPRequest('/rest/', this.cookies);
            // init model connector for REST 
            this.mc = new ModelConnector(this.httpreq);
            utils.setIndexOf();
            this.activeInstance = false;
            this.GLOBAL = {};
            // init site views
            var userInvitation = new FriendInvitation();
            var gv = new GlobalView({eventPubSub:this.eventPubSub});
            var pmv = new ProjectManagerView({mc:this.mc, eventPubSub:this.eventPubSub});
            var pwv = new ProjectWizardView({mc:this.mc, router:this, eventPubSub:this.eventPubSub});
            var pav = new ProjectAssetsView({mc:this.mc, GLOBAL:this.GLOBAL, eventPubSub:this.eventPubSub});
            var pev = new ProfileEditorView({mc:this.mc, cookies:this.cookies, eventPubSub:this.eventPubSub});
            var sv = new SandboxView({mc:this.mc, GLOBAL:this.GLOBAL, eventPubSub:this.eventPubSub});
            // define models
            this.projects = new UserCollection();
            this.profile = new UserModel();
            // override default backbone model sync method to be compatible with Magnet REST APIs
            syncOverride(this.mc, this.eventPubSub);
            Backbone.history.start();
            this.initGetProfile();
            this.initGetIdentity();
            this.initGetActiveInstance();
            this.initSendSupport();
            this.initGetProjectDeployability();
        },
        routes: {
            ''                           : 'projectManager',
            'login'                      : 'login',
            'logout'                     : 'logout',
            'project-wizard/:id'         : 'projectWizard',
            'project-manager'            : 'projectManager',
            'project-manager/:id'        : 'projectManager',
            '/:id'                       : 'projectManager',
            'project-assets/:id'         : 'projectAssets',
            'sandbox'                    : 'sandbox',
            'project-version-assets/:id' : 'projectVersionAssets',
            'profile-editor'             : 'profileEditor',
            '*notFound'                  : 'projectManager'
        },
        projectWizard: function(id){
            var me = this;
            me.auth(function(){
                me.eventPubSub.trigger('resetPages', 'project-wizard');
                me.eventPubSub.trigger('initProjectWizard', {id:id});
            });
        },
        projectManager: function(id){
            var me = this;
            me.auth(function(){
                me.getProjects(function(){
                    me.eventPubSub.trigger('resetPages', 'project-manager');
                    me.eventPubSub.trigger('getActiveInstance', function(instanceId, instanceName, status){
                        me.eventPubSub.trigger('initProjectManager', {
                            projects       : me.projects,
                            activeInstance : instanceId,
                            status         : status,
                            id             : id
                        });
                    });
                });
            });
        },
        projectAssets: function(id){
            var me = this;
            me.auth(function(){
                me.eventPubSub.trigger('getActiveInstance', function(instanceId, instanceName){
                    me.eventPubSub.trigger('resetPages', 'project-assets');
                    me.eventPubSub.trigger('initProjectAssets', {
                        activeInstance : instanceId,
                        instanceName   : instanceName,
                        id             : id
                    });
                });
            });
        },
        projectVersionAssets: function(id){
            var me = this;
            me.auth(function(){
                me.eventPubSub.trigger('getActiveInstance', function(instanceId, instanceName){
                    me.eventPubSub.trigger('resetPages', 'project-assets');
                    me.eventPubSub.trigger('initProjectAssets', {
                        id             : id,
                        activeInstance : instanceId,
                        instanceName   : instanceName,
                        isVersion      : true
                    });
                });
            });
        },
        sandbox: function(){
            var me = this;
            me.auth(function(){
                me.eventPubSub.trigger('resetPages', 'sandbox');
                me.eventPubSub.trigger('initSandbox');
            });
        },
        profileEditor: function(){
            var me = this;
            me.auth(function(){
                me.eventPubSub.trigger('resetPages', 'profile-editor');
                me.eventPubSub.trigger('initProfileEditor', me.profile);
            });
        },
        login: function(){
            var me = this;
            me.auth(function(){
                Backbone.history.navigate('#/');
            });
        },
        auth: function(callback){
            var me = this;
            var user = me.cookies.get('magnet_auth');
            // stop any active polling threads
            timer.stop();
            if((!user || user == null)){
                me.unsetUserPanel();
                me.getProfile(function(){
                    me.cookies.create(
                        'magnet_auth', me.profile.attributes.name+'|'+me.profile.attributes.firstName+' '+me.profile.attributes.lastName+'|'+me.profile.attributes.companyName, 1);
                    me.setUserPanel(
                        me.profile.attributes.name,
                        me.profile.attributes.firstName+' '+me.profile.attributes.lastName,
                        me.profile.attributes.companyName == 'undefined' ? '' : me.profile.attributes.companyName
                    );
                    callback();
                });
            }else{
                var profile = user.split('|');
                me.setUserPanel(profile[0], profile[1], profile[2] == 'undefined' ? '' : profile[2]);
                if(!me.profile || me.profile.isNew()){
                    me.getProfile(function(){
                        callback();
                    });
                }else{
                    callback();
                }
            }
        },
        unsetUserPanel: function(){
            $('.control-buttons').addClass('hidden');
            $('#user-panel').hide();
            $('#username-placeholder').text('');
            $('.user-username').html('');
        },
        setUserPanel: function(username, name, company){
            $('#username-placeholder').text(username);
            $('.user-username').html(name);
            $('.user-company').html(company);
            $('#login-container').addClass('hidden');
            $('.control-buttons').removeClass('hidden');
        },
        // logout using logout controller
        logout: function(){
            var me = this;
            me.profile = null;
            me.cookies.remove('magnet_auth');
            $('.control-buttons').addClass('hidden');
            me.mc.query('logout', 'POST', null, function(){
                window.location.href = '/login/';
            }, 'html', 'application/x-www-form-urlencoded', function(){
                me.login();
            });
        },
        // get project model from collection and trigger initiation of wizard
        getProject: function(id, view){
            var me = this;
            var project = me.projects.where({
                magnetId : id
            });
            if(project.length > 0){
                me.eventPubSub.trigger(view, project[0]);
            }else{
                Backbone.history.navigate('#/');
                Alerts.Error.display({
                    title   : 'Project Does Not Exist', 
                    content : 'This project does not exist.'
                });
            }
        },
        // get profile of the current user
        getProfile: function(callback){
            var me = this;
            me.profile = new UserModel();
            me.profile.fetch({
                data: {
                    relationship : {
                        name     : 'profile',
                        magnetId : '@me'
                    }
                },
                success: function(){
                    if(typeof callback == typeof Function){
                        callback();
                    }
                },
                error: function(){
                    console.log('error retrieving user profile');
                }
            });
        },
        // get identify of the current user
        getIdentity: function(callback){
            var me = this;
            me.user = new UserModel({
                id       : '@me',
                magnetId : '@me'
            });
            me.user.fetch({
                success : callback,
                error   : function(){
                    console.log('error retrieving user');
                }
            });
        },
        // bind pub sub to get current user's profile properties
        initGetProfile: function(){
            var me = this;
            me.eventPubSub.bind('getUserProfile', function(callback){
                me.getProfile(function(){
                    callback(me.profile);
                });
            });
        },
        // fetch collection of projects associated with the current user
        getProjects: function(callback){
            var me = this;
            me.projects.fetch({
                data : {
                    relationship : {
                        name     : 'projects',
                        magnetId : '@me'
                    },
                    relations : ['project-versions'],
                    pageSize  : 1000,
                    sorts     : {
                        lastModifiedTime : 'desc'
                    }
                },
                success : callback,
                error   : function(){
                    Alerts.Error.display({
                        title   : 'Error Retrieving Projects',
                        content : 'There was a problem retrieving your list of projects. Please try again later.'
                    });
                }
            });
        },
        // bind pub sub to get current user properties
        initGetIdentity: function(){
            var me = this;
            me.eventPubSub.bind('getUserIdentity', function(callback){
                me.getIdentity(function(){
                    callback(me.user);
                });
            });
        },
        // init pub sub to obtain the active cloud instance
        initGetActiveInstance: function(){
            var me = this;
            me.eventPubSub.bind('getActiveInstance', function(callback){
                me.getActiveInstance(function(instanceId, instanceName, status){
                    callback(instanceId, instanceName, status);
                });
            });
        },
        // validate project for ability to deploy to sandbox by validating whether required properties are set
        initGetProjectDeployability: function(){
            var me = this;
            me.eventPubSub.bind('checkProjectDeployability', function(options){
                me.mc.query('projects/'+options.magnetId+'/projectSetting?_magnet_select=*', 'GET', null, function(properties){
                    var additions = [];
                    if(properties.userAuth == 'LDAP') additions.push('LDAP');
                    if(properties.userAuth == 'AD') additions.push('Active Directory');
                    var validations = validator.isInvalid(properties, additions);
                    if(validations){
                        options.error(validations);
                    }else{
                        options.success();
                    }
                }, null, 'application/json', function(){
                    options.error();
                });
            });
        },
        // get the currently active sandbox cloud instance entity
        getActiveInstance: function(callback){
            var me = this;
            me.mc.query('users/@me/cloudcompute-instance?_magnet_relation=project&_magnet_select=deployedApplicationStatus', 'GET', null, function(data, status, xhr){
                callback(data.project ? data.project.id : false, data.project ? data.project.name : false, data.deployedApplicationStatus);
            }, null, null, function(){
                callback(false);
            });
        },
        // init pub sub to send a support notification
        initSendSupport: function(){
            var me = this;
            me.eventPubSub.bind('sendSupportNotification', function(data){
                me.sendSupportNotification(data);
            });
        },
        // send a support notification to Magnet support
        sendSupportNotification: function(data){
            $.ajax({
                type        : 'POST',
                url         : '/rest/submitSupport',
                dataType    : 'html',
                contentType : 'application/x-www-form-urlencoded',
                data        : {
                    reason       : data.type,
                    name         : this.profile.attributes.firstName + ' ' + this.profile.attributes.lastName,
                    emailAddress : this.profile.attributes['eMails'][0],
                    content      : 'Project Name: ' + data.json.name // JSON.stringify(data.json)
                }
            });
        }
    });
    return Router;
});
var Alerts = {};