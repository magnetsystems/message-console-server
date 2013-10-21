define(['jquery', 'backbone', 'models/UserModel', 'models/ProjectModel'], function($, Backbone, UserModel, ProjectModel){
    var View = Backbone.View.extend({
        el: '#pw-intro',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initPWIntroView', function(params){
                me.project = params.project;
                me.settings = params.settings;
                $('#project-details-container').find('input, textarea').val('');
                $('#project-details-container input[name="version"]').val('1.0');
            });
            me.options.eventPubSub.bind('introComplete', function(){
                me.storeDetails();
            });
        },
        // store project details form data into data object
        storeDetails: function(){
            var obj = utils.collect(this.$el);
            if(this.isValid(obj.config)){
                this.create(obj.config);
            }else{
                $('.button-group[did="intro"]').removeClass('hidden');
            }
        },
        // create project entity on the server
        create: function(data){
            var me = this;
            me.project.set(me.initialData);
            me.project.save({
                name        : utils.cleanJavaKeywords(data.name),
                version     : data.version,
                description : data.description
            }, {
                success: function(){
                    $('#pw-intro-fields').hide().find('input, textarea').val('');
                    me.options.eventPubSub.trigger('PWNextTransition', 'intro');
                    //me.createSettings(me.project.attributes.magnetId);
                },
                error: function(){
                    me.createFailure('error creating project.')
                }
            });
        },
        // create settings entity on the server
        createSettings: function(magnetId){
            var me = this;
            var settings = new ProjectModel();
            settings.save(me.initialData, {
                data : {
                    relationship : {
                        name     : 'projectSetting',
                        magnetId : magnetId
                    }
                },
                success: function(data){
                    me.settings.set(me.initialData);
                    me.project.set({
                        projectSetting : me.initialData
                    });
                    me.options.eventPubSub.trigger('PWNextTransition', 'intro');
                },
                error: function(){
                    me.createFailure('error creating project settings entity.')
                }
            });
        },
        initialData: {
            encryptionEnabled           : false,
            useGeoLocation              : false,
            userAuth                    : "defaultUser",
            gcmEnabled                  : false,
            apnsEnabled                 : false,
            apnsHost                    : "gateway.sandbox.push.apple.com",
            emailEnabled                : false,
            helloWorldControllerEnabled : true,
            salesforceEnabled           : false,
            facebookEnabled             : false,
            linkedinEnabled             : false
        },
        // perform actions after project creation failure
        createFailure: function(msg){
            $('.button-group[did="intro"]').removeClass('hidden');
            Alerts.Error.display({
                title   : 'Invalid Project Name',
                content : 'The project name you specified has already been used. Please use another project name and try again.'
            });
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
        }
    });
    return View;
});