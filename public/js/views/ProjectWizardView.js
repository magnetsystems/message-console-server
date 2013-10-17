define(['jquery', 'backbone', 'models/ProjectModel', 'views/PWIntroView', 'views/PWCoreView', 'views/PWSamplesView', 'views/PWEnterpriseView', 'views/PWSummaryView'], function($, Backbone, ProjectModel, PWIntroView, PWCoreView, PWSamplesView, PWEnterpriseView, PWSummaryView){
    var View = Backbone.View.extend({
        el: '#project-wizard',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initProjectWizard', function(params){
                $('#project-details-container input').val('');
                $('#project-details-container input[name="name"]').focus();
                me.fallbackImg = $('#wizard-diagram-canvas img');
                me.stepTitle = $('#wizard-step-title');
                me.stepTitlePart1 = $('#wizard-step-title .first');
                me.stepTitlePart2 = $('#wizard-step-title .second');
                // fetch project entity and start wizard
                if(!params.id){
                    me.reset(0);
                    me.project = new ProjectModel();
                }else{
                    me.project = new ProjectModel({
                        magnetId : params.id,
                        id       : params.id
                    });
                    me.project.fetch({
                        success: function(){
                            me.switchView(4);
                        },
                        error: function(){
                            console.log('error retrieving project');
                            Backbone.history.navigate('#/project-assets');
                        }
                    });
                }
            });
            // a collection of steps and associated views to be initiated
            me.steps = [
                {action : 'intro', view : 'PWIntroView', title : ['0', 'Configure Your App']},
                {action : 'core', view : 'PWCoreView', title : ['1', 'Configure Your App']},
                {action : 'samples', view : 'PWSamplesView', title : ['2', 'Choose Sample APIs']},
                {action : 'enterprise', view : 'PWEnterpriseView', title : ['3', 'Add Outside APIs']},
                {action : 'summary', view : 'PWSummaryView', title : ['4', 'Start Developing']}
            ];
            // initiate the wizard step views
            var iv = new PWIntroView({
                mc          : me.options.mc,
                eventPubSub : me.options.eventPubSub
            });
            var cv = new PWCoreView({
                mc          : me.options.mc,
                eventPubSub : me.options.eventPubSub,
                router      : me.options.router
            });
            var sv = new PWSamplesView({
                mc          : me.options.mc,
                eventPubSub : me.options.eventPubSub
            });
            var ev = new PWEnterpriseView({
                mc          : me.options.mc,
                eventPubSub : me.options.eventPubSub
            });
            var summary = new PWSummaryView({
                mc          : me.options.mc,
                eventPubSub : me.options.eventPubSub
            });
            // initiate view and perform ui transition when going to next step
            me.options.eventPubSub.bind('PWNextTransition', function(action){
                me.hideButtons();
                me.startNext(action);
            });
            me.options.eventPubSub.bind('PWToggleAccordion', function(view){
                var toggle = $('.accordion-group[did="'+view+'"] .accordion-toggle');
                if(!toggle.hasClass('active')){
                    toggle.click();
                }
            });
            me.accordionLocked = false;
            $('.popup-info').mouseover(function(){
                var obj = $(this);
                setTimeout(function(){
                    obj.popover('show');
                }, 100);
            }).mouseleave(function(){
                $(this).popover('hide');
            });
        },
        events: {
            'click .go-back' : 'goBack',
            'click .go-next' : 'goNext',
            'click #summary-components .summary-component' : 'goToStepEvent',
            'click .accordion-toggle' : 'toggleAccordion',
            'click .btn-group button' : 'toggleSwitch',
            'click input[type="radio"]' : 'toggleRadio',
            'click #finish-wizard-btn' : 'finishWizard',
            'click #project-name-editor i' : 'editProjectName',
            'click #save-project-details-btn' : 'create',
            'click #save-project-details-edits-btn' : 'saveProjectDetailEdits',
            'click #cancel-project-details-edits-btn' : 'resetEdit'
        },
        hideButtons: function(){
            var group = this.$el.find('.button-group');
            group.addClass('hidden');
            //group.find('a, button').addClass('disabled');
        },
        showButton: function(did){
            var group = this.$el.find('.button-group[did="'+did+'"]');
            group.removeClass('hidden');
            //group.removeClass('hidden').find('a, button').removeClass('disabled');
        },
        // make bootstrap accordion work with wizard design
        toggleAccordion: function(e){
            var me = this;
            if(me.accordionLocked === false){
                me.accordionLocked = true;
                setTimeout(function(){
                    me.accordionLocked = false;
                }, 340);
                var current = $(e.currentTarget);
                if(current.hasClass('active')){
                    setTimeout(function(){
                        current.removeClass('active');
                    }, 240);
                }else{
                    current.addClass('active');
                }
                var parent = current.closest('.accordion').find('.accordion-toggle');
                $.each(parent, function(){
                    var item = $(this);
                    if(item.hasClass('active') && item.attr('href') != current.attr('href')){
                        setTimeout(function(){
                            item.removeClass('active');
                        }, 240);
                    }
                });
            }
        },
        confirmAPNS: function(attrName, callback){
            var me = this;
            if(me.project.attributes.jdbcAppEnabled === false && (attrName == 'helloWorldControllerDBEnabled' || attrName == 'sampleEntityEnabled')){
                Alerts.Confirm.display({
                    title   : 'This Sample Requires an App Database',
                    content : 'Since you disabled the App Database in the first step of the project wizard, this sample cannot be enabled. Would you like to enable the App Database?'
                }, function(){
                    me.project.save({
                        jdbcAppEnabled : true
                    });
                    callback();
                });
            }else if(attrName == 'helloWorldControllerEnabled' && $('div[did="helloWorldControllerDBEnabled"] button[did="true"]').hasClass('btn-primary')){
                Alerts.General.display({
                    title   : 'Hello World Controller With Persistence Disabled',
                    content : 'Since you enabled this sample, the Hello World Controller With Persistence will be disabled.'
                });
                var btnGroup = $('div[did="helloWorldControllerDBEnabled"]');
                var btn = btnGroup.find('button[did="false"]');
                me.toggleSwitchAction(btn, btnGroup);
                callback();
            }else if(attrName == 'helloWorldControllerDBEnabled' && $('div[did="helloWorldControllerEnabled"] button[did="true"]').hasClass('btn-primary')){
                Alerts.General.display({
                    title   : 'Hello World Controller Disabled',
                    content : 'Since you enabled this sample, the Hello World Controller will be disabled.'
                });
                var btnGroup = $('div[did="helloWorldControllerEnabled"]');
                var btn = btnGroup.find('button[did="false"]');
                me.toggleSwitchAction(btn, btnGroup);
                callback();
            }else{
                callback();
            }
        },
        // toggle and set state of 2-setting switch buttons
        toggleSwitch: function(e){
            var me = this;
            var curr = $(e.currentTarget);
            var buttonGroup = curr.closest('.btn-group');
            me.confirmAPNS(buttonGroup.attr('did'), function(){
                me.toggleSwitchAction(curr, buttonGroup);
            });
        },
        toggleSwitchAction: function(btn, buttonGroup){
            if(!buttonGroup.hasClass('disabled') && !buttonGroup.closest('.optional-parameters').hasClass('disabled')){
                buttonGroup.find('button').removeClass('btn-primary');
                btn.addClass('btn-primary');
                if(!buttonGroup.hasClass('btn-group-only')){
                    var group = btn.closest('.accordion-group');
                    var state = 'OFF';
                    switch(btn.html()){
                        case 'OFF': group.find('.preview-status').html('OFF'); state = 'OFF'; break;
                        case 'ON': group.find('.preview-status').html('ON'); state = 'ON'; break;
                        case 'Don\'t Include': group.find('.preview-status').html('Not Included'); state = 'OFF'; break;
                        case 'Include': group.find('.preview-status').html('Included'); state = 'ON'; break;
                    }
                    if(state == 'OFF'){
                        group.find('div[did="OFF"]').removeClass('hidden');
                        group.find('div[did="ON"]').addClass('hidden');
                        group.find('.optional-parameters').addClass('disabled').append('<div class="overlay"></div>');
                    }else{
                        group.find('div[did="ON"]').removeClass('hidden');
                        group.find('div[did="OFF"]').addClass('hidden');
                        group.find('.optional-parameters').removeClass('disabled').find('.overlay').remove();
                    }
                }
            }
        },
        // toggle display of views associated with a radio collection
        toggleRadio: function(e){
            var curr = $(e.currentTarget);
            var parent = curr.closest('.radio-collection');
            parent.find('.radio-toggle').addClass('hidden');
            parent.find('div[did="'+curr.attr('did')+'"]').removeClass('hidden');
            var group = curr.closest('.accordion-group');
            group.find('.preview-status').html(curr.val().replace('defaultUser', 'Default User').replace('AD', 'Active Directory').replace('DB', 'Database'));
        },
        // go back to the last step in the wizard
        goBack: function(e){
            e.preventDefault();
            this.hideButtons();
            this.options.eventPubSub.trigger(this.steps[this.currentIndex].action+'Complete', true);
            var i = this.currentIndex-1;
            if(i >= 0){
                this.fallbackImg.attr('src', '../images/wizard/wizgraphic-'+i+'.png');
                this.stepTitle.removeClass().addClass('step'+i);
                this.stepTitlePart1.html(this.steps[i].title[0]);
                this.stepTitlePart2.html(this.steps[i].title[1]);
                this.switchView(i);
            }
        },
        // go to the next step in the wizard
        goNext: function(e){
            e.preventDefault();
            var btn = $(e.currentTarget);
            this.hideButtons();
            var currentStep = btn.closest('.button-group').attr('did');
            this.options.eventPubSub.trigger(currentStep+'Complete');
        },
        // event that occurs when a button is clicked to take user to a particular step
        goToStepEvent: function(e){
            var dom = $(e.currentTarget);
            var action = dom.attr('action');
            var view = dom.attr('view');
            this.goToStep(action, view);
        },
        // bind transition action to wizard diagram click
        goToStep: function(action, view){
            var i = this.getIndex(action);
            this.fallbackImg.attr('src', '../images/wizard/wizgraphic-'+i+'.png');
            this.stepTitle.removeClass().addClass('step'+i);
            this.stepTitlePart1.html(this.steps[i].title[0]);
            this.stepTitlePart2.html(this.steps[i].title[1]);
            this.switchView(i, view);
        },
        // start transition or complete wizard
        startNext: function(action){
            var i = this.getIndex(action)+1;
            this.fallbackImg.attr('src', '../images/wizard/wizgraphic-'+i+'.png');
            this.stepTitle.removeClass().addClass('step'+i);
            this.stepTitlePart1.html(this.steps[i].title[0]);
            this.stepTitlePart2.html(this.steps[i].title[1]);
            this.switchView(i);
        },
        // finish the wizard and take user to project assets screen
        finishWizard: function(){
            var me = this;
            Alerts.Confirm.display({
                title   : 'Confirm Asset Generation',
                content : 'Are you sure you wish to begin generating assets? This process will take several minutes.'
            }, function(){
                me.hideButtons();
                /* call controller to generate assets for the current project. do not provide a callback
                 due to long processing time. assets page will poll for the generated assets */
                me.options.mc.query('projects/'+me.project.attributes.magnetId+'/assets?forceToGenerate=true', 'GET', null, function(){
                    Backbone.history.navigate('#/project-assets/'+me.project.attributes.magnetId);
                });
            });
        },
        // get index of step within wizard step array
        getIndex: function(action){
            for(var i=0;i<this.steps.length;++i){
                if(this.steps[i].action == action){
                    return i;
                }
            }
            return false;
        },
        // perform ui slide transition when a step is triggered
        switchView: function(i, view){
            this.reset(i);
            this.options.eventPubSub.trigger('init'+this.steps[i].view, {
                project : this.project,
                view    : view
            });
        },
        // reset ui states
        reset: function(currentIndex){
            this.uiLock = false;
            this.currentIndex = currentIndex || 0;
            this.hideButtons();
            this.showButton(this.steps[this.currentIndex].action);
            $('.wizard_content').addClass('hidden').eq(this.currentIndex).removeClass('hidden');
        },
        // edit project name in place
        editProjectName: function(){
            var me = this;
            $('#project-name-editor').hide();
            var editor = $('#project-name-editor-2');
            var fieldName = editor.find('input[name="name"]');
            var fieldDescription = editor.find('textarea[name="description"]');
            var fieldVersion = editor.find('input[name="version"]');
            fieldName.val(me.project.attributes.name);
            fieldDescription.val(me.project.attributes.description);
            fieldVersion.val(me.project.attributes.version);
            editor.show();
            editor.unbind('mouseleave').mouseleave(function(){
                me.resetEdit();
            });
        },
        // create project entity on the server
        create: function(){
            var me = this;
            var obj = utils.collect($('#project-details-container'));
            if(me.isValid(obj.config)){
                me.project.save({
                    name        : utils.cleanJavaKeywords(obj.config.name),
                    version     : obj.config.version,
                    description : obj.config.description
                }, {
                    success: function(){
                        me.project.set(me.initData(me.project.attributes.id));
                        $('#save-project-details-btn').remove();
                        $('#wizard-image-bgk, #wizard-diagram-canvas').show();
                        $('#wizard-intro-left').hide('fast');
                        $('.popover').addClass('hidden');
                        $('#project-details-container input').attr('disabled', 'disabled').addClass('disabled');
                        me.startNext('intro');
                    },
                    error: function(){
                        Alerts.Error.display({
                            title   : 'Invalid Project Name',
                            content : 'The project name you specified has already been used. Please use another project name and try again.'
                        });
                    }
                });
            }
        },
        // validate input from data object
        isValid: function(obj){
            if($.trim(obj.name) == ''){
                Alerts.Error.display({
                    title   : 'Required Field Left Blank',
                    content : '"Project Name" must be filled out before continuing.'
                });
                return false;
            }else if($.trim(obj.name).length > 40){
                Alerts.Error.display({
                    title   : 'Project Name Length Error',
                    content : 'The project name cannot exceed 40 characters. Please shorten your project name and try again.'
                });
                return false;
            }else if(/^[^a-zA-Z]/.test($.trim(obj.name)) || /[^a-zA-Z0-9-_ ]/.test($.trim(obj.name))){
                Alerts.Error.display({
                    title   : 'Invalid Project Name',
                    content : '"Project Name" can only contain letters, numbers, spaces, and underscores, and must begin with a letter.'
                });
                return false;
            }else if($.trim(obj.description) == ''){
                Alerts.Error.display({
                    title   : 'Required Field Left Blank',
                    content : '"Project Description" must be filled out before continuing.'
                });
                return false;
            }else if($.trim(obj.version) == ''){
                Alerts.Error.display({
                    title   : 'Required Field Left Blank',
                    content : '"Version" must be filled out before continuing.'
                });
                return false;
            }
            return true;
        },
        initData: function(pid){
            var cleanName = utils.cleanName(this.project.attributes.name);
            return {
                encryptionEnabled             : false,
                useGeoLocation                : false,
                userAuth                      : "MYSQL",
                jdbcAppEnabled                : true,
                gcmEnabled                    : false,
                apnsEnabled                   : false,
                apnsHost                      : "gateway.sandbox.push.apple.com",
                jdbcHost                      : 'localhost',
                jdbcPort                      : 3306,
                jdbcSystemUsername            : cleanName+'_systemuser_'+pid,
                jdbcSystemPassword            : cleanName+'_systempass_'+pid,
                jdbcAppUsername               : cleanName+'_appuser_'+pid,
                jdbcAppPassword               : cleanName+'_apppass_'+pid,
                jdbcAppDBName                 : cleanName+'_app_'+pid,
                emailEnabled                  : false,
                helloWorldControllerEnabled   : true,
                helloWorldControllerDBEnabled : false,
                salesforceEnabled             : false,
                facebookEnabled               : false,
                linkedinEnabled               : false
            }
        },
        // save edited project details
        saveProjectDetailEdits: function(){
            var me = this;
            var editor = $('#project-name-editor-2');
            var fieldName = editor.find('input[name="name"]');
            var fieldDescription = editor.find('textarea[name="description"]');
            var fieldVersion = editor.find('input[name="version"]');
            me.updateProjectDetails({
                name        : utils.cleanJavaKeywords(fieldName.val()),
                description : fieldDescription.val(),
                version     : fieldVersion.val()
            }, function(proj){
                me.project.set({
                    name        : proj.name,
                    description : proj.description,
                    version     : proj.version
                });
                me.resetEdit();
            }, function(){
                fieldName.val(me.project.attributes.name);
                fieldDescription.val(me.project.attributes.description);
                fieldVersion.val(me.project.attributes.version);
                me.resetEdit();
            });
        },
        // restore project name editor to plain text
        resetEdit: function(){
            $('#project-name-editor').html(this.project.attributes.name+' <i class="icon-edit"></i>').show();
            $('#project-name-editor-2').hide();
        },
        // update project details
        updateProjectDetails: function(obj, callback, failback){
            if($.trim(obj.name) == ''){
                Alerts.Error.display({
                    title   : 'Required Field Left Blank',
                    content : '"Project Name" must be filled out before continuing.'
                });
                failback();
                return false;
            }else if($.trim(obj.name).length > 40){
                Alerts.Error.display({
                    title   : 'Project Name Length Error',
                    content : 'The project name cannot exceed 40 characters. Please shorten your project name and try again.'
                });
                return false;
            }else if(/^[A-Za-z\d\s]+$/.test($.trim(obj.name)) == false){
                Alerts.Error.display({
                    title   : 'Invalid Project Name',
                    content : '"Project Name" can only contain letters, numbers, and spaces.'
                });
                failback();
                return false;
            }
            var project = new ProjectModel({
                magnetId : this.project.attributes.magnetId,
                id       : this.project.attributes.id
            });
            project.save(obj, {
                success : function(){
                    callback(project.attributes);
                },
                error   : failback
            });
        }
    });
    return View;
});