define(['jquery', 'backbone', 'models/ProjectModel', 'models/UserModel'], function($, Backbone, ProjectModel, UserModel){
    var View = Backbone.View.extend({
        el: '#sandbox',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initSandbox', function(){
                if(me.options.GLOBAL.project){
                    me.project = me.options.GLOBAL.project;
                    delete me.options.GLOBAL.project;
                    me.cloudCompute = new UserModel();
                    me.setupIfProjectVersion();
                    me.render();
                    me.deploySandbox(null, true);
                }else{
                    $('#sandbox-container').html('<div class="page-loader"><p>Loading page.. please wait one moment.</p><img src="../images/assets/progress-loading.gif" /></div>');
                    me.getSandboxDetails(function(){
                        me.project = new ProjectModel(me.cloudCompute.attributes.project || {});
                        me.setupIfProjectVersion();
                        me.render();
                        if(me.cloudCompute.attributes.deployedApplicationStatus == 'started'){
                            me.pollSandboxStatus();
                        }else{
                            me.renderSandboxDetails();
                            if(me.cloudCompute.attributes.deployedApplicationStatus == 'complete'){
                                me.fetchRuntimeLogsAndRender();
                            }else if(me.cloudCompute.attributes.deployedApplicationStatus == 'failed'){
                                me.fetchDeploymentErrorLogs();
                            }
                        }
                    });
                }
            });
        },
        events: {
            'click #deploy-sandbox' : 'deploySandbox',
            'click .sendSupport' : 'sendSupport',
            'click #sandbox-terminal-refresh' : 'fetchRuntimeLogsAndRender',
            //'click #sandbox-terminal-autorefresh button' : 'setAutoRefresh',
            'click #sandbox-terminal-numlines button' : 'setLines'
        },
        // deploy sandbox
        deploySandbox: function(e, forceDeploy){
            var me = this;
            if(!forceDeploy && $(e.currentTarget).hasClass('disabled')) return false;
            timer.stop();
            me.hideTerminalControls();
            me.renderTerminal('');
            me.cloudCompute.set({
                deployedApplicationStatus : 'started'
            });
            me.renderSandboxDetails(1);
            me.options.mc.query(me.project.urlRoot+'/'+me.project.attributes.magnetId+'/deploy', 'POST', null, function(cloudOperations){
                me.isFirstPoll = true;
                me.pollSandboxStatus();
            }, null, null, function(){
                me.onSandboxFailure(true);
            });
        },
        // call a valid sandbox REST API, if call was successful execute callback
        getSandboxDetails: function(callback){
            var me = this;
            me.cloudCompute = new UserModel();
            me.cloudCompute.fetch({
                data : {
                    relationship : {
                        name     : 'cloudcompute-instance',
                        magnetId : '@me'
                    },
                    relations : ['project']
                },
                success: function(){
                    callback();
                },
                error: function(){
                    Backbone.history.navigate('#/project-list');
                    /*
                    Alerts.Error.display({
                        title   : 'Error Retrieving Sandbox Details',
                        content : 'There was a problem retrieving your sandbox details. Please try again later.'
                    });
                    */
                }
            });
        },
        // render sandbox page
        render: function(){
            var template = _.template($('#MainSandboxView').html(), {
                project   : this.project,
                isVersion : this.isVersion
            });
            $('#sandbox-container').html(template);
            return this;
        },
        // render sandbox details
        renderSandboxDetails: function(deployStage){
            var template = _.template($('#SandboxDetailsView').html(), {
                project      : this.project,
                cloudCompute : this.cloudCompute,
                deployStage  : deployStage || 0
            });
            $('#sandbox-details').html(template);
            return this;
        },
        // poll for the sandbox status
        pollSandboxStatus: function(){
            var me = this;
            me.renderSandboxDetails(2);
            timer.poll(function(loop){
                me.getSandboxStatus(function(sandboxStatus){
                    loop.paused = false;
                    me.checkSandboxStatus(sandboxStatus);
                });
            }, 1000 * 10, '.processing');
        },
        // call a valid sandbox REST API, if call was successful execute callback
        getSandboxStatus: function(callback){
            var me = this;
            $.ajax({
                url      : '/rest/users/@me/cloudcompute-instance?_magnet_select=deployedApplicationStatus',
                type     : 'GET',
                timeout  : 30000,
                dataType : 'json',
                success  : function(res){
                    if(me.isFirstPoll){
                        me.isFirstPoll = false;
                        res.deployedApplicationStatus = 'started';
                    }
                    me.cloudCompute.set(res);
                    callback(res.deployedApplicationStatus);
                },
                error    : function(){
                    callback();
                }
            });
        },
        // start a final check of the server before reporting success
        checkSandboxStatus: function(sandboxStatus){
            var me = this;
            if(sandboxStatus  == 'complete' || sandboxStatus == 'failed'){
                timer.stop();
                if(sandboxStatus == 'complete'){
                    me.renderSandboxDetails(3);
                    me.checkBeacon(function(state){
                        if(state == true){
                            me.getSandboxDetails(function(){
                                me.renderSandboxDetails();
                                me.fetchRuntimeLogsAndRender();
                            });
                        }else{
                            me.onSandboxFailure();
                        }
                    });
                }else{
                    me.onSandboxFailure();
                }
            }
        },
        // perform a final check on the sandbox instance by requesting a file in the public.dir
        checkBeacon: function(callback){
            $.support.cors = true;
            $.ajax({
                url      : this.project.attributes.sandboxUrl+'beacon.json',
                type     : 'GET',
                timeout  : 30000,
                dataType : 'json',
                cache    : false,
                success  : function(){
                    callback(true);
                },
                error    : function(){
                    callback(false);
                }
            });
        },
        onSandboxFailure: function(noLogs){
            this.cloudCompute.set({
                deployedApplicationStatus : 'failed'
            });
            this.renderSandboxDetails();
            if(!noLogs) this.fetchDeploymentErrorLogs();
            Alerts.Error.display({
                title   : 'Error Deploying Sandbox',
                content : 'There was an error deploying to the sandbox. To diagnose the issue, view the debugging console on right. You can still run the server locally using the generated server binary. For additional support, please contact Magnet support.'
            });
        },
        // fetch deployment error logs
        fetchDeploymentErrorLogs: function(){
            var me = this;
            me.startTerminalLoading();
            $.ajax({
                url      : me.cloudCompute.attributes['magnet-uri'].replace('magnet:', '/rest')+'/cloudOperations?_magnet_select=*&status=failed&_magnet_descending=startTime&_magnet_max_results=1',
                type     : 'GET',
                dataType : 'json',
                success  : function(data){
                    if(data.page){
                        me.renderTerminal(data.page[0].standardOutput.replace(/\n/g, '<br />'));
                    }
                },
                error    : function(){
                    me.renderTerminal('');
                    console.log('no deployment error messages available.');
                }
            });
        },
        /*
        // start poll to show a constantly updated debugging console
        startConsolePoll: function(state, lines, seconds){
            var me = this;
            timer.stop();
            if(state){
                timer.poll(function(loop){
                    me.getRuntimeLog(lines, function(data){
                        loop.paused = false;
                        me.renderTerminal(data);
                    });
                }, 1000 * (seconds || 10), '.processing');
            }
        },
        setConsolePoll: function(){
            $('#sandbox-terminal-container button').show();
            this.startConsolePoll($('#sandbox-terminal-autorefresh button.active').attr('did') == 'on', $('#sandbox-terminal-numlines button.active').attr('did'));
        },
        setAutoRefresh: function(e){
            $('#sandbox-terminal-autorefresh button').removeClass('active');
            $(e.currentTarget).addClass('active');
            this.setConsolePoll();
        },
        */
        fetchRuntimeLogsAndRender: function(){
            var me = this;
            if(!me.isFetching){
                me.isFetching = true;
                me.fetchRuntimeLogs($('#sandbox-terminal-numlines button.active').attr('did'), function(data){
                    me.isFetching = false;
                    me.renderTerminal(data);
                });
            }
        },
        setLines: function(e){
            $('#sandbox-terminal-numlines button').removeClass('active');
            $(e.currentTarget).addClass('active');
            this.fetchRuntimeLogsAndRender();
        },
        // fetch instance runtime logs
        fetchRuntimeLogs: function(lines, callback){
            var me = this;
            regex = [/INFO/g, /WARNING/g, /SEVERE/g];
            replace = ['<span style="color:green">INFO</span>', '<span style="color:yellow">WARNING</span>', '<span style="color:red">SEVERE</span>'];
            me.startTerminalLoading();
            $.ajax({
                url      : me.cloudCompute.attributes['magnet-uri'].replace('magnet:', '/rest')+'/applicationLog?lines='+lines,
                type     : 'GET',
                success  : function(data){
                    me.showTerminalControls();
                    for(var i=regex.length;i--;){
                        data = data.replace(regex[i], ' '+replace[i]);
                    }
                    callback(data);
                },
                error    : function(){
                    me.isFetching = false;
                    me.hideTerminalControls();
                    me.renderTerminal('There are no logs available right now.');
                }
            });
        },
        startTerminalLoading: function(){
            this.renderTerminal('<div class="sandbox-terminal-loading"><img src="../images/assets/progress-loading.gif" /></div>');
        },
        showTerminalControls: function(){
            $('#sandbox-terminal-controls').show();
        },
        hideTerminalControls: function(){
            $('#sandbox-terminal-controls').hide();
        },
        // render terminal
        renderTerminal: function(message){
            var template = _.template($('#SandboxTerminalView').html(), {
                message : message
            });
            $('#sandbox-terminal').html(template);
            return this;
        },
        setupIfProjectVersion: function(){
            if(this.project.attributes.magnetId.indexOf('project-version') != -1){
                this.project.urlRoot = 'project-versions';
                this.isVersion = true;
            }
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
        }
        /*
        getFailureLog: function(){
            var me = this;
            var log = new ProjectModel({
                magnetId : me.project.attributes.magnetId,
                id       : me.project.attributes.id
            });
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
                    $('#asset-generation-failure-log').html(log.attributes.message);
                },
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Retrieving Projects',
                        content : 'There was a problem retrieving your projects. Please try again later.'
                    });
                }
            });
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
            var me = this;
            var genAssetsBtn = $('#generate-assets');
            var deploySandboxBtn = $('#deploy-sandbox');
            var initLoader = $('#init-deploy-loader');
            var deployLoader = $('#deploy-sandbox-loader');
            $('#sandbox').html('');
            genAssetsBtn.hide();
            deploySandboxBtn.hide();
            initLoader.show();
            deployLoader.hide();
            timer.stop();
            me.polling = false;
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
                    content : 'This project cannot be deployed because of services which were included with missing properties during the project wizard. However, you can still run the server locally using the generated server binary. For additional support, please contact Magnet support.'
                });
                genAssetsBtn.show();
                deploySandboxBtn.show();
                initLoader.hide();
                deployLoader.hide();
            });
        },
        // fetch sandbox credentials from the server and poll for sandbox status if response is correct
        initSandbox: function(isActiveInstance){
            var me = this;
            if(isActiveInstance){
                me.pollSandboxStatus();
            }else{
                if(me.isVersion){
                    $('#deploy-sandbox').show();
                }else{
                    me.checkValidity(function(){
                        $('#deploy-sandbox').show();
                    });
                }
            }
        },
        // poll for deployment status
        pollDeploymentStatus: function(cloudOperations){
            var me = this;
            me.polling = true;
            timer.poll(function(loop){
                me.getDeployStatus(cloudOperations, function(deployStatus){
                    loop.paused = false;
                    if(deployStatus  == 'complete' || deployStatus == 'failed'){
                        timer.stop();
                        me.polling = false;
                        if(deployStatus == 'complete'){
                            me.initSandbox(true);
                        }else{
                            $('#deploy-sandbox-loader, #starting-sandbox-loader').hide();
                            $('#deploy-sandbox').show();
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
        // validate project for ability to deploy to sandbox
        checkValidity: function(callback){
            var me = this;
            me.options.mc.query('projects/'+me.project.attributes.magnetId+'/projectSetting?_magnet_select=*', 'GET', null, function(properties){
                var additions = [];
                if(properties.userAuth == 'LDAP') additions.push('LDAP');
                if(properties.userAuth == 'AD') additions.push('Active Directory');
                var validations = validator.isInvalid(properties, additions);
                if(validations){
                    me.renderSandbox('invalid', validations);
                }else{
                    callback();
                }
            }, null, 'application/json', function(){
                me.renderSandbox('invalid');
            });
        },
        */
    });
    return View;
});