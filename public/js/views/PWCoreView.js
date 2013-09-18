define(['jquery', 'backbone', 'models/ProjectModel', 'models/ContentModel', 'views/UploadView'], function($, Backbone, ProjectModel, ContentModel, UploadView){
    var View = Backbone.View.extend({
        el: '#pw-core',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initPWCoreView', function(params){
                me.options.router.navigate('/project-wizard/'+params.project.attributes.magnetId, {
                    trigger : false,
                    replace : true
                });
                me.project = params.project.set({
                    projectSetting : params.project.attributes.projectSetting || []
                });
                me.displayProjectEdit();
                me.render(params.view);
            });
            me.options.eventPubSub.bind('coreComplete', function(isPrevious){
                me.storeDetails(isPrevious);
            });
            // upon successful upload of apns certificate, display alert and append to wsdl file array
            me.options.eventPubSub.bind('uploadAPNSCertFileComplete', function(params){
                if(params.xhr.status == 200 || params.xhr.status == 201 || params.xhr.status == 'unknown'){
                    var configFiles = me.project.get('configFiles');
                    if(!configFiles){
                        me.project.set({
                            configFiles : [
                                params.params.model.attributes
                            ]
                        });
                    }else{
                        configFiles.push(params.params.model.attributes);
                    }
                    var apnsList = $('#pw-apns-list');
                    if(apnsList.length){
                        apnsList.append('<li did="'+params.params.model.attributes.magnetId+'">\
                        <strong>'+params.params.model.attributes.name+'</strong><i class="icon-remove-sign"></i></li>');
                    }else{
                        $('#pw-apns-cert-file').html('<ul id="pw-apns-list"><li did="'+params.params.model.attributes.magnetId+'">\
                        <strong>'+params.params.model.attributes.name+'</strong><i class="icon-remove-sign"></i></li></ul>');
                    }
                }else{
                    Alerts.Error.display({
                        title   : 'Error Uploading Certificate',
                        content : 'There was an error uploading the certificate.'
                    });
                }
                me.options.eventPubSub.trigger('btnComplete', $('#pw-apns-cert-file-btn'));
            });
        },
        events: {
            'click #pw-apns-cert-file-btn' : 'uploadCertificate',
            'click #pw-apns-list li i' : 'removeCert'
        },
        // store project details form data into data object
        storeDetails: function(isPrevious){
            var me = this;
            var properties = utils.collect(me.$el);
            if(properties['userAuth'] == 'DB'){
                if(!properties['jdbcPort'] || properties['jdbcPort'] == 0){
                    properties['jdbcPort'] = 3306;
                }
            }
            $('.button-group[did="core"]').removeClass('hidden');
            var validation = validator.isInvalid(properties.config);
            if(validation){
                Alerts.Confirm.display({
                    title   : 'Parameters Not Filled Out',
                    content : 'The '+validation.text+' feature'+(validation.ary.length == 1 ? ' was' : 's were')+' included, but not all the parameters were filled out. You can continue, but the project will not be able to deploy to your sandbox in the cloud.'
                }, function(){
                    setTimeout(function(){
                        me.confirmCert(properties, function(){
                            me.save(properties, isPrevious);
                        });
                    }, 800);
                });
            }else{
                me.confirmCert(properties, function(){
                    me.save(properties, isPrevious);
                });
            }
        },
        confirmCert: function(properties, callback){
            var me = this;
            if(properties.config.apnsEnabled === true && (!me.project.attributes.configFiles || me.project.attributes.configFiles.length == 0)){
                Alerts.Confirm.display({
                    title   : 'APNS Certficate Not Uploaded',
                    content : 'Since the APNS feature was enabled, an APNS certificate should be uploaded. You can continue without uploading a certificate, but the project will not be able to deploy to your sandbox in the cloud.'
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
            var projectSetting = me.project.get('projectSetting');
            me.options.mc.query('projects/'+me.project.attributes.magnetId+'/setProjectConfig', 'POST', properties.api, function(){
                $.extend(projectSetting, properties.config);
                if(!isPrevious){
                    me.options.eventPubSub.trigger('PWNextTransition', 'core');
                }
            }, null, null, function(){
                Alerts.Error.display({
                    title   : 'Error Setting Properties',
                    content : 'There was an error setting the project properties. Please contact Magnet support.'
                });
                btnGroup.removeClass('hidden');
            });
        },
        displayProjectEdit: function(){
            $('#project-name-editor').html(this.project.attributes.name+' <i class="icon-edit"></i>');
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
            if(!this.project.attributes.configFiles){
                this.initCertUpload();
            }
            return this;
        },
        // create web component for apns cert upload
        initCertUpload: function(){
            var uploader = new UploadView({
                el          : '#pw-apns-cert-file',
                context     : 'APNSCertFile',
                method      : 'PUT',
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
            var model = new ProjectModel();
            model.save({
                name        : file.text(),
                description : 'server.config.ApnsAccount.certFile'
            }, {
                data : {
                    relationship : {
                        name     : 'configFiles',
                        magnetId : this.project.attributes.magnetId
                    }
                },
                success: function(model){
                    me.options.eventPubSub.trigger('uploadAPNSCertFile', '/rest/contents/'+model.attributes.magnetId+'/data', {
                        model : model
                    });
                },
                error: function(){
                    me.options.eventPubSub.trigger('btnComplete', btn);
                    Alerts.Error.display({
                        title   : 'Error Uploading Certificate',
                        content : 'There was an error uploading the certificate.'
                    });
                }
            });
        },
        // remove apns certificate
        removeCert: function(e){
            var me = this;
            var item = $(e.currentTarget).closest('li');
            var magnetId = item.attr('did');
            var content = new ContentModel({
                magnetId : magnetId,
                id       : magnetId.slice(magnetId.lastIndexOf(':')+1)
            });
            content.destroy({
                success: function(){
                    utils.removeByProp(me.project.get('configFiles'), 'magnetId', magnetId);
                    item.remove();
                    if(me.project.attributes.configFiles.length == 0){
                        me.initCertUpload();
                    }
                },
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Deleting Certificate',
                        content : 'There was an error deleting the certificate.'
                    });
                }
            });
        }
    });
    return View;
});