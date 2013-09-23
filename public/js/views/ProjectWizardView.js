define(['jquery', 'backbone', 'models/ProjectModel', 'models/ProjectSettingModel', 'views/PWIntroView', 'views/PWCoreView', 'views/PWSamplesView', 'views/PWEnterpriseView', 'views/PWThirdPartyView', 'views/PWSummaryView'], function($, Backbone, ProjectModel, ProjectSettingModel, PWIntroView, PWCoreView, PWSamplesView, PWEnterpriseView, PWThirdPartyView, PWSummaryView){
    var View = Backbone.View.extend({
        el: '#project-wizard',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initProjectWizard', function(params){
                // initialize HTML5 canvas
                me.initDiagram({
                    editMode    : params.id != 'new',
                    currentStep : params.id != 'new' ? 'summary' : 'intro'
                });
                // fetch project entity and start wizard
                if(params.id == 'new'){
                    me.showButton('intro');
                    me.project = new ProjectModel();
                    me.settings = new ProjectSettingModel();
                    me.options.eventPubSub.trigger('initPWIntroView', {
                        project  : me.project,
                        settings : me.settings
                    });
                    // reset the state of the project wizard
                    me.reset();
                }else{
                    me.project = new ProjectModel({
                        magnetId : params.id
                    });
                    me.project.fetch({
                        data: {
                            pageSize : 1000,
                            relations : ['projectSetting', 'webservices', 'configFiles']
                        },
                        success: function(){
                            me.switchView(5);
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
                {action : 'intro', view : 'PWIntroView'},
                {action : 'core', view : 'PWCoreView'},
                {action : 'samples', view : 'PWSamplesView'},
                {action : 'enterprise', view : 'PWEnterpriseView'},
                {action : 'thirdparty', view : 'PWThirdPartyView'},
                {action : 'summary', view : 'PWSummaryView'}
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
            var tv = new PWThirdPartyView({
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
            $('.popup-info').focus(function(){
                $(this).popover('show');
            }).blur(function(){
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
        // toggle and set state of 2-setting switch buttons
        toggleSwitch: function(e){
            var curr = $(e.currentTarget);
            var buttonGroup = curr.closest('.btn-group');
            if(!buttonGroup.hasClass('disabled') && !buttonGroup.closest('.optional-parameters').hasClass('disabled')){
                buttonGroup.find('button').removeClass('btn-primary');
                curr.addClass('btn-primary');
                if(!buttonGroup.hasClass('btn-group-only')){
                    var group = curr.closest('.accordion-group');
                    var state = 'OFF';
                    switch(curr.html()){
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
                if(!utils.isCanvasSupported()){
                    this.fallbackImg.attr('src', '../images/wizard/server-'+i+'.png');
                    this.switchView(i);
                }else{
                    this.doStepTransition(i, true);
                }
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
            var me = this;
            var i = this.getIndex(action);
            if(!utils.isCanvasSupported()){
                me.fallbackImg.attr('src', '../images/wizard/server-'+i+'.png');
                me.switchView(i, view);
                return false;
            }
            me.wiz.goToStep(action, function(){
                me.switchView(i, view);
            });
        },
        // start transition or complete wizard
        startNext: function(action){
            var me = this;
            var i = this.getIndex(action)+1;
            if(!utils.isCanvasSupported()){
                me.fallbackImg.attr('src', '../images/wizard/server-'+i+'.png');
                me.switchView(i);
                return false;
            }
            if(action == 'intro'){
                var tween = new Kinetic.Tween({
                    node     : me.wiz.metadata.intro.sprite,
                    x        : 0,
                    y        : 80,
                    duration : .7,
                    onFinish : function(){
                        var txtTween = new Kinetic.Tween({
                            node    : me.wiz.textLayer,
                            opacity : 1
                        });
                        txtTween.play();
                        for(var id in me.wiz.metadata){
                            var tween = new Kinetic.Tween({
                                node    : me.wiz.metadata[id].sprite,
                                opacity : 1
                            });
                            tween.play();
                        }
                        me.doStepTransition(i);
                    }
                });
                tween.play();
            }else if(!me.steps[i]){
                console.log('error');
            }else{
                me.doStepTransition(i);
            }
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
        // transition to a step
        doStepTransition: function(i, isReverse){
            var me = this;
            if(!me.uiLock){
                me.uiLock = true;
                me.wiz[isReverse ? 'goBack' : 'goNext'](function(){
                    me.switchView(i);
                });
            }
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
        // init HTML5 diagram. if canvas isnt supported, display different images when transitioning to a step
        initDiagram : function(params, callback){
            var me = this;
            if(!utils.isCanvasSupported()){
                $('#wizard-diagram-canvas').html('<img style="width:100%" />');
                me.fallbackImg = $('#wizard-diagram-canvas img');
                if(params.editMode){
                    me.fallbackImg.attr('src', '../images/wizard/server-5.png');
                }else{
                    me.fallbackImg.attr('src', '../images/wizard/server-0.png');
                }
                return false;
            }
            // only create new wizard diagram object if it doesnt exist. this greatly improves performance
            if(me.wiz){
                if(params.editMode){
                    // set up wizard diagram for project edit
                    me.wiz.config(params);
                    me.wiz.metadata.intro.sprite.setPosition(0, 80);
                    me.wiz.metadata.intro.sprite.setAnimation('enabled');
                    me.wiz.metadata.summary.title.setOpacity(.6);
                    for(var sid in me.wiz.metadata){
                        me.wiz.metadata[sid].enabled = true;
                        if(me.wiz.metadata[sid].textParams){
                            me.wiz.metadata[sid].sprite.setOpacity(1);
                            me.wiz.metadata[sid].sprite.setAnimation(me.wiz.startStep == sid ? 'active' : me.wiz.default);
                            me.wiz.metadata[sid].title.setFill('#000');
                        }
                        if(me.wiz.metadata[sid].borderParams){
                            me.wiz.metadata[sid].border.setOpacity(me.wiz.startStep == sid ? 1 : 0);
                        }
                    }
                    me.wiz.textLayer.setOpacity(1);
                    me.wiz.stage.draw();
                }else{
                    // set up wizard diagram for new project
                    me.wiz.config(params);
                    me.wiz.metadata.intro.sprite.setPosition(80, 60);
                    me.wiz.metadata.intro.sprite.setAnimation('enabled');
                    me.wiz.metadata.summary.title.setOpacity(0);
                    for(var sid in me.wiz.metadata){
                        me.wiz.metadata[sid].enabled = false;
                        if(me.wiz.metadata[sid].textParams){
                            me.wiz.metadata[sid].sprite.setOpacity(0);
                            me.wiz.metadata[sid].sprite.setAnimation(me.wiz.startStep == sid ? 'active' : me.wiz.default);
                            me.wiz.metadata[sid].title.setFill('#888');
                        }
                        if(me.wiz.metadata[sid].borderParams){
                            me.wiz.metadata[sid].border.setOpacity(me.wiz.startStep == sid ? 1 : 0);
                        }
                    }
                    me.wiz.textLayer.setOpacity(0);
                    me.wiz.stage.draw();
                }
                me.resize();
            }else{
                // create new instance of wizard diagram
                me.wiz = new WizardDiagram(params, function(){
                    me.wiz.metadata.intro.sprite = new Kinetic.Sprite({
                        x          : params.editMode ? 0 : 80,
                        y          : params.editMode ? 80 : 60,
                        image      : me.wiz.metadata.intro.image,
                        animation  : 'enabled',
                        animations : me.wiz.metadata.intro.animations,
                        frameRate  : 0,
                        index      : 0,
                        opacity    : 1
                    });
                    me.wiz.init();
                    me.wiz.metadata.intro.sprite.moveDown();
                    me.wiz.metadata.intro.sprite.moveDown();
                    me.wiz.metadata.intro.sprite.moveDown();
                    me.wiz.metadata.intro.sprite.moveDown();
                    me.wiz.metadata.intro.sprite.moveDown();
                    if(!me.boundEvents){
                        me.bind();
                    }
                    me.wiz.onClick = function(action){
                        var i = me.getIndex(action);
                        me.switchView(i);
                    };
                }, function(){
                    console.log('done with wizard');
                });
            }
        },
        // bind a resize event to global window object which resizes the wizard diagram (using a delay since resize of canvas element is expensive)
        bind : function(){
            var me = this;
            me.boundEvents = true;
            $(window).resize(function(){
                clearTimeout(me.resizeAction);
                me.resizeAction = setTimeout(function(){
                    me.resize();
                }, 300);
            });
        },
        // proportionally resize wizard diagram based on browser resolution (has min and max constraints)
        resize : function(){
            var cWidth = this.$el.find('#wizard-container').width() + 10;
            var ratio = cWidth / 450;
            var cHeight = Math.ceil(510 * ratio);
            this.wiz.stage.setWidth(cWidth > 455 ? 455 : cWidth);
            this.wiz.stage.setHeight(cHeight > 516 ? 516 : cHeight);
            this.wiz.stage.setScale(ratio > 1.01111 ? 1.01111 : ratio);
            if(this.wiz.currentStep == 'summary' || this.wiz.editMode){
                this.wiz.metadata.summary.title.setOpacity(.6);
            }
            this.wiz.stage.draw();
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