define(['jquery', 'backbone', 'models/ProjectModel', 'views/UploadView'], function($, Backbone, ProjectModel, UploadView){
    var View = Backbone.View.extend({
        el: '#pw-core',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initPWCoreView', function(params){
                me.project = params.project;
                me.isFirst = params.isFirst;
                me.render(params.view);
            });
            me.options.eventPubSub.bind('coreComplete', function(isPrevious){
                me.storeDetails(isPrevious);
            });
            // upon successful upload of apns certificate, display alert and append to wsdl file array
            me.options.eventPubSub.bind('uploadAPNSCertFileComplete', function(params){
                if(params.res.success){
                    me.project.set({
                        apnsCertName : params.filename
                    });
                    var apnsList = $('#pw-apns-list');
                    if(apnsList.length){
                        apnsList.append('<li did="'+params.filename+'">\
                        <strong>'+params.filename+'</strong><i class="icon-remove-sign"></i></li>');
                    }else{
                        $('#pw-apns-cert-file').html('<ul id="pw-apns-list"><li did="'+params.filename+'">\
                        <strong>'+params.filename+'</strong><i class="icon-remove-sign"></i></li></ul>');
                    }
                }else{
                    Alerts.Error.display({
                        title   : 'Error Uploading Certificate',
                        content : 'There was an error uploading the certificate.'
                    });
                }
                me.options.eventPubSub.trigger('btnComplete', $('#pw-apns-cert-file-btn'));
            });
            me.isFirst = true;
        },
        events: {
            'click #pw-apns-cert-file-btn' : 'uploadCertificate',
            'click #pw-apns-list li i' : 'removeCert'
        },
        // store project details form data into data object
        storeDetails: function(isPrevious){
            var me = this;
            var properties = utils.collect(me.$el);
            properties.config.jdbcHost = properties.config.jdbcHost || 'localhost';
            properties.config.jdbcPort = properties.config.jdbcPort || 3306;
            properties.config.jdbcSystemUsername = properties.config.jdbcSystemUsername || 'appDBUser';
            properties.config.jdbcSystemPassword = properties.config.jdbcSystemPassword || 'appDBPassword';
            properties.config.jdbcAppDBName = properties.config.jdbcAppDBName || 'appDBName';
            properties.config.jdbcAppUsername = properties.config.jdbcAppUsername || 'sysDBUser';
            properties.config.jdbcAppPassword = properties.config.jdbcAppPassword || 'sysDBPassword';
            $('.button-group[did="core"]').removeClass('hidden');
            var validation = validator.isInvalid(properties.config);
            if(validation){
                Alerts.Confirm.display({
                    title   : 'Parameters Not Filled Out',
                    content : 'The '+validation.text+' feature'+(validation.ary.length == 1 ? ' was' : 's were')+' included, but not all the parameters were filled out. You can continue, but the project will not be able to deploy to your sandbox in the cloud.'
                }, function(){
                    setTimeout(function(){
                        me.confirmCert(properties, function(){
                            me.confirmDisableAppDB(properties, function(){
                                me.save(properties, isPrevious);
                            });
                        });
                    }, 800);
                });
            }else{
                me.confirmCert(properties, function(){
                    me.confirmDisableAppDB(properties, function(){
                        me.save(properties, isPrevious);
                    });
                });
            }
        },
        confirmCert: function(properties, callback){
            var me = this;
            if(me.project.attributes.apnsEnabled && (!me.project.attributes.apnsCertName || me.project.attributes.apnsCertName.length == 0)){
                Alerts.Confirm.display({
                    title   : 'APNS Certficate Not Uploaded',
                    content : 'Since the APNS feature was enabled, an APNS certificate should be uploaded. You can continue without uploading a certificate, but the certificate must be manually placed in the project later.'
                }, function(){
                    callback();
                });
            }else{
                callback();
            }
        },
        confirmDisableAppDB: function(properties, callback){
            var me = this;
            if(!properties.config.jdbcAppEnabled || properties.config.jdbcAppEnabled === false){
                Alerts.Confirm.display({
                    title   : 'Are You Sure?',
                    content : 'The App Database was disabled. You can continue, but will not be able to use server entities or any sample APIs requiring persistence.'
                }, function(){
                    callback();
                });
            }else{
                callback();
            }
        },
        save: function(properties, isPrevious){
            var me = this, btnGroup = $('.button-group[did="core"]');
            btnGroup.addClass('hidden');
            var proj = new ProjectModel();
            proj.set({
                magnetId : me.project.attributes.magnetId,
                id       : me.project.attributes.id
            });
            proj.save(properties.config, {
                success: function(){
                    me.project.set(properties.config);
                    if(!isPrevious){
                        me.options.eventPubSub.trigger('PWNextTransition', 'core');
                    }
                },
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Setting Properties',
                        content : 'There was an error setting the project properties. Please contact Magnet support.'
                    });
                    btnGroup.removeClass('hidden');
                }
            });
        },
        // render core configuration
        render: function(view){
            var template = _.template($('#PWCoreView').html(), {
                project : this.project
            });
            $('#pw-core-form').html(template);
            if(view){
                this.options.eventPubSub.trigger('PWToggleAccordion', view);
            }
            if(!this.project.attributes.apnsCertName || this.project.attributes.apnsCertName.length == 0){
                this.initCertUpload();
            }
            if(this.isFirst){
                $('#project-details-container input[name="name"]').focus();
                this.isFirst = false;
            }
            return this;
        },
        // create web component for apns cert upload
        initCertUpload: function(){
            var uploader = new UploadView({
                el          : '#pw-apns-cert-file',
                context     : 'APNSCertFile',
                method      : 'POST',
                validation  : {},
                eventPubSub : this.options.eventPubSub
            });
            $('<button id="pw-apns-cert-file-btn" class="btn btn-primary" type="button" txt="Upload">Upload</button>').insertAfter('#pw-core .qq-upload-button');
        },
        // store cert properties to server and init cert file upload
        uploadCertificate: function(){
            var me = this;
            var file = this.$el.find('.qq-upload-file');
            if(!file.length){
                return false;
            }
            var btn = $('#pw-apns-cert-file-btn');
            me.options.eventPubSub.trigger('btnLoading', btn);
            me.options.eventPubSub.trigger('uploadAPNSCertFile', '/rest/projects/'+me.project.attributes.magnetId+'/uploadAPNSCertificate');
        },
        // remove apns certificate
        removeCert: function(e){
            var me = this;
            var item = $(e.currentTarget).closest('li');
            $.ajax({
                url  : '/rest/projects/'+me.project.attributes.magnetId+'/removeAPNSCertificate',
                type : 'POST'
            }).done(function(){
                me.project.set({
                    apnsCertName : null
                });
                item.remove();
                me.initCertUpload();
            }).fail(function(){
                Alerts.Error.display({
                    title   : 'Error Deleting Certificate',
                    content : 'There was an error deleting the certificate.'
                });
            });
        }
    });
    return View;
});