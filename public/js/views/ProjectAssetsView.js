define(['jquery', 'backbone', 'models/ProjectModel'], function($, Backbone, ProjectModel){
    var View = Backbone.View.extend({
        el: '#project-assets',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initProjectAssets', function(params){
                me.activeInstance = params.activeInstance;
                me.instanceName = params.instanceName;
                if(!params.id){
                    Backbone.history.navigate('#/project-manager');
                }else{
                    $('#generate-assets').show();
                    me.isVersion = params.isVersion;
                    me.project = new ProjectModel({
                        magnetId : params.id
                    });
                    me.project.urlRoot = me.isVersion ? 'project-versions' : 'projects';
                    me.project.set({
                        contents    : [],
                        contentUrls : []
                    });
                    $('#pa-container').html('<div class="page-loader"><p>Loading page.. please wait one moment.</p><img src="../images/assets/progress-loading.gif" /></div>');
                    me.intervalFetch(false, true);
                }
            });
        },
        events: {
            'click .pa-download' : 'downloadFile',
            'click #generate-assets' : 'generateAssets',
            'click #pa-deploy-sandbox' : 'deploySandboxConfirm',
            'click .sendSupport' : 'sendSupport',
            'click .attachment-link' : 'showLog'
        },
        // download a file by loading url into iframe
        downloadFile: function(e){
            e.preventDefault();
            if(utils.isIOS()){
                Alerts.Error.display({
                    title   : 'Download Not Supported',
                    content : 'Download of assets are not supported for iOS devices. Please sign in from a computer and try again.'
                });
                return false;
            }
            if(this.project.attributes.contentUrls){
                var type = $(e.currentTarget).attr('did');
                if(type){
                    var proj = this.project.attributes.contentUrls[type];
                    $('#download-container').html('<iframe src="'+proj.url+(proj.filename ? '?name='+proj.filename : '')+'"></iframe>');
                }
            }
        },
        // render project assets page
        render: function(){
            var me = this;
            var template = _.template($('#ProjectAssetsView').html(), {
                project     : this.project,
                isVersion   : me.isVersion,
                isGenerated : this.project.attributes.assetStatus == 'GENERATED'
            });
            $('#pa-container').html(template);
            return this;
        },
        // setup ajax polling to refresh content of this page allowing built assets to be displayed async
        intervalFetch: function(isForcedPoll, isFirst){
            var me = this, genAssetsBtn = $('#generate-assets'), hasPolled = false;
            me.project.attributes.contents = [];
            timer.poll(function(loop){
                me.getStatus(isFirst, function(){
                    loop.paused = false;
                    // there is a delay on the server to update the assetStatus so keep polling until there is an assetStatus
                    if(isForcedPoll && !me.project.attributes.assetStatus){
                        return false;
                    }
                    if(me.project.attributes.assetStatus != 'GENERATING'){
                        timer.stop('.processing');
                        if(me.project.attributes.assetStatus == 'FAILED'){
                            me.getFailureLog();
                        }
                        if(me.project.attributes.assetStatus == 'GENERATED'){
                            if((isFirst && hasPolled) || me.isVersion){
                                genAssetsBtn.hide();
                            }else{
                                genAssetsBtn.show();
                            }
                            me.fetchAll();
                        }else if(me.isVersion){
                            me.initSandbox(me.project.attributes.magnetId.indexOf(me.activeInstance) != -1);
                        }
                    }else{
                        hasPolled = true;
                        genAssetsBtn.hide();
                    }
                });
            }, 1000 * 15, '.processing');
        },
        // make a simple call to get only the asset status.
        getStatus: function(isFirst, callback){
            var me = this;
            var data = me.isVersion ? {
                selects : ['assetStatus', 'name', 'description'],
                relations : ['project']
            } : {
                selects : ['assetStatus', 'name', 'description']
            };
            me.project.fetch({
                data: data,
                success: function(){
                    if(isFirst && me.project.attributes.assetStatus == 'GENERATED'){
                        // do nothing
                    }else{
                        me.render();
                    }
                    callback();
                },
                error: function(){
                    console.log('error retrieving project');
                    Backbone.history.navigate('#/project-manager');
                }
            });
        },
        getFailureLog: function(){
            var me = this;
            var log = new ProjectModel({
                magnetId : me.project.attributes.magnetId,
                id       : me.project.attributes.id
            });
            log.urlRoot = me.isVersion ? 'project-versions' : 'projects';
            log.fetch({
                data : {
                    relationship : {
                        name     : 'asEventObject',
                        magnetId : log.attributes.magnetId
                    },
                    sorts : {
                        timestamp : 'desc'
                    },
                    search : {
                        eventSubType : 'GENERATE_ASSET'
                    },
                    maxResults : 1
                },
                success: function(){
                    if(log.attributes.data && log.attributes.data.length > 0){
                        $('#asset-generation-failure-log').html(log.attributes.data[0].message);
                        $('#asset-generation-failure-attachment').html('<a class="btn btn-primary" target="_blank" href="/rest/log-event-records/'+utils.magnetId(log.attributes.data[0]['magnet-uri'])+'/attachment"><i class="icon-file icon-white"></i> View Server Log</a>');
                    }
                },
                error: function(){
                    $('#asset-generation-failure-log').html('There are no logs available for this error.');
                    $('#asset-generation-failure-attachment').html('');
                }
            });
        },
        // retrieve all project data to render view
        fetchAll: function(){
            var me = this;
            var data = me.isVersion ? {
                relations : ['contents', 'project']
            } : {
                relations : ['contents']
            };
            me.project.fetch({
                data: data,
                success: function(){
                    if(me.project.attributes.project){
                        me.project.set({
                            sandboxUrl      : me.project.attributes.project.sandboxUrl,
                            sandboxUser     : me.project.attributes.project.sandboxUser,
                            sandboxPassword : me.project.attributes.project.sandboxPassword
                        });
                    }
                    me.render();
                    me.initSandbox(me.project.attributes.magnetId.indexOf(me.activeInstance) != -1);
                },
                error: function(){
                    console.log('error retrieving project');
                    Backbone.history.navigate('#/project-manager');
                }
            });
        },
        // check if project is generating assets
        isGenerating: function(){
            return this.project.attributes.assetStatus == 'GENERATING';
        },
        // manually generate assets
        generateAssets: function(e){
            e.preventDefault();
            var me = this;
            if(!me.isGenerating()){
                $('#generate-assets').hide();
                me.options.mc.query(me.project.urlRoot+'/'+me.project.attributes.magnetId+'/assets?forceToGenerate=true', 'GET', null, function(){
                    timer.stop();
                    me.intervalFetch(true);
                });
                /*
                Alerts.General.display({
                    title   : 'Generating Assets',
                    content : 'Your project is now generating assets. Assets for this project may take several minutes to generate. Stay on this page to view assets as they are generated.'
                });
                */
            }else{
                Alerts.Error.display({
                    title   : 'Project Is Already Generating',
                    content : 'The project is already generating assets. Please wait for it to complete.'
                });
            }
        },
        // confirm whether user wishes to destroy existing sandbox deployment to deploy this sandbox
        deploySandboxConfirm: function(e){
            e.preventDefault();
            var me = this;
            if(me.activeInstance){
                Alerts.Confirm.display({
                    title   : 'Confirm Sandbox Deployment',
                    content : 'Only one project can be deployed at a time. If you continue, your existing project "'+me.instanceName+'" will be removed and replaced with your new project. Please select "Cancel" if this is not what you want to do.'
                }, function(){
                    me.deploySandbox();
                });
            }else{
                me.deploySandbox();
            }
        },
        // deploy sandbox
        deploySandbox: function(){
            this.options.GLOBAL.project = this.project;
            Backbone.history.navigate('#/sandbox');
            /*
            var me = this;
            var genAssetsBtn = $('#generate-assets');
            var deploySandboxBtn = $('#pa-deploy-sandbox');
            var initLoader = $('#init-deploy-loader');
            var deployLoader = $('#pa-deploy-sandbox-loader');
            $('#sandbox-status-container').html('');
            genAssetsBtn.hide();
            deploySandboxBtn.hide();
            initLoader.show();
            deployLoader.hide();
            timer.stop();
            me.options.GLOBAL.project = me.project;
            Backbone.history.navigate('#/sandbox');
            /*
            me.options.mc.query(this.project.urlRoot+'/'+this.project.attributes.magnetId+'/deploy', 'POST', null, function(cloudOperations){
                me.activeInstance = me.project.attributes.id;
                me.instanceName = me.project.attributes.name;
                me.pollDeploymentStatus(cloudOperations);
                deploySandboxBtn.hide();
                genAssetsBtn.show();
                deployLoader.show();
                initLoader.hide();
            }, null, null, function(){
                Alerts.Error.display({
                    title   : 'Error Deploying Sandbox',
                    content : 'There was an error deploying to the sandbox. For additional support, please contact Magnet support.'
                });
                genAssetsBtn.show();
                deploySandboxBtn.show();
                initLoader.hide();
                deployLoader.hide();
            });
            */
        },
        /*
        // poll for deployment status
        pollDeploymentStatus: function(cloudOperations){
            var me = this;
            timer.poll(function(loop){
                me.getDeployStatus(cloudOperations, function(deployStatus){
                    loop.paused = false;
                    if(deployStatus  == 'complete' || deployStatus == 'failed'){
                        timer.stop();
                        if(deployStatus == 'complete'){
                            me.initSandbox(true);
                        }else{
                            $('#pa-deploy-sandbox-loader, #starting-sandbox-loader').hide();
                            $('#pa-deploy-sandbox').show();
                            me.renderSandbox('failed');
                        }
                    }
                });
            }, 1000 * 15, '.processing2');
        },
        // get status of deployment
        getDeployStatus: function(cloudOperations, callback){
            $.ajax({
                url      : cloudOperations['magnet-uri'].replace('magnet:', '/rest')+'?_magnet_select=status',
                type     : 'GET',
                dataType : 'json',
                success  : function(data){
                    callback(data.status);
                },
                error    : function(){
                    callback('failed');
                }
            });
        },
        */
        // fetch sandbox credentials from the server and poll for sandbox status if response is correct
        initSandbox: function(isDeployment){
            var me = this;
            $('#pa-deploy-sandbox-loader').hide();
            if(isDeployment){
                $('#checking-sandbox-loader').show();
                me.isFirstPoll = true;
                me.pollSandboxStatus();
            /*
            }else if(!me.isVersion && (!me.project.attributes.sandboxUser || !me.project.attributes.sandboxPassword)){
                me.renderSandbox('invalid');
            */
            }else{
                if(me.isVersion){
                    $('#pa-deploy-sandbox').show();
                }else{
                    me.options.eventPubSub.trigger('checkProjectDeployability', {
                        magnetId : me.project.attributes.magnetId,
                        success : function(){
                            $('#pa-deploy-sandbox').show();
                        },
                        error : function(validations){
                            me.renderSandbox('invalid', validations);
                        }
                    });
                }
            }
        },
        // render the sandbox view
        renderSandbox: function(status, validations){
            if(status == 'invalid') $('#pa-deploy-sandbox').hide();
            var template = _.template($('#SandboxView').html(), {
                project          : this.project.attributes,
                status           : status,
                validations      : validations,
                isActiveInstance : this.project.attributes.magnetId.indexOf(this.activeInstance) != -1
            });
            $('#sandbox-status-container').html(template);
        },
        // poll for the sandbox status
        pollSandboxStatus: function(){
            var me = this;
            timer.poll(function(loop){
                me.getSandboxStatus(function(sandboxStatus){
                    $('#checking-sandbox-loader').hide();
                    if(me.isFirstPoll && sandboxStatus != 'complete' && sandboxStatus != 'failed'){
                        $('#starting-sandbox-loader').show();
                    }
                    me.isFirstPoll = false;
                    loop.paused = false;
                    if(sandboxStatus == 'complete' || sandboxStatus == 'failed'){
                        timer.stop();
                        if(sandboxStatus == 'complete'){
                            me.renderSandbox('running');
                            /* dont perform final check on server
                            me.checkServer(function(status){
                                me.renderSandbox(status);
                            });
                            */
                        }else{
                            me.renderSandbox('failed');
                        }
                        $('#checking-sandbox-loader, #pa-deploy-sandbox-loader, #starting-sandbox-loader').hide();
                        $('#pa-deploy-sandbox').show();
                    }else{
                        $('#sandbox-status-container').html('');
                    }
                });
            }, 1000 * 10, '.processing');
        },
        // call a valid sandbox REST API, if call was successful execute callback
        getSandboxStatus: function(callback){
            $.ajax({
                url      : '/rest/users/@me/cloudcompute-instance?_magnet_select=deployedApplicationStatus',
                type     : 'GET',
                timeout  : 30000,
                dataType : 'json',
                success  : function(res){
                    callback(res.deployedApplicationStatus);
                },
                error    : function(){
                    callback();
                }
            });
        },
        // perform a final check on the sandbox instance
        checkServer: function(callback){
            var me = this;
            $.support.cors = true;
            $.ajax({
                url      : this.project.attributes.sandboxUrl+'beacon.json',
                type     : 'GET',
                timeout  : 30000,
                dataType : 'json',
                cache    : false,
                success  : function(res){
                    callback('running');
                },
                error    : function(){
                    callback('failed');
                }
            });
        },
        // send an automated support notification
        sendSupport: function(e){
            var btn = $(e.currentTarget);
            this.options.eventPubSub.trigger('sendSupportNotification', {
                type : btn.attr('info'),
                json : this.project.attributes
            });
            btn.hide();
            Alerts.General.display({
                title   : 'Notification Sent',
                content : 'Details about the problem you experienced have been sent to the Magnet support team. We appreciate your assistance.'
            });
        },
        // show log in a popup browser window
        showLog: function(e){
            var url = $(e.currentTarget).attr('did');
            window.open(url, '123894712893', 'width=600,height=400,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=0,top=0');
        }
    });
    return View;
});