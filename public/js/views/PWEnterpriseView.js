define(['jquery', 'backbone', 'models/ProjectModel', 'collections/ProjectCollection', 'models/ServiceModel'], function($, Backbone, ProjectModel, ProjectCollection, ServiceModel){
    var View = Backbone.View.extend({
        el: '#pw-enterprise',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initPWEnterpriseView', function(params){
                me.project = params.project;
                me.retrieveWSDLs();
            });
            /*
            // create web component for wsdl upload
            var uploader = new UploadView({
                el          : '#pw-wsdl-file',
                context     : 'WSDLFile',
                method      : 'PUT',
                validation  : {},
                eventPubSub : me.options.eventPubSub
            });
            $('<button id="pw-wsdl-addfile-btn" class="btn btn-primary" type="button" txt="Upload">Upload</button>').insertAfter('#pw-enterprise .qq-upload-button');

            // upon successful upload of a wsdl, display alert and append to wsdl file array
            me.options.eventPubSub.bind('uploadWSDLFileComplete', function(params){
                if(params.xhr.status == 200 || params.xhr.status == 201 || params.xhr.status == 'unknown'){
                    me.fetchService(params.params.model);
                }else{
                    Alerts.Error.display({
                        title   : 'Error Uploading File',
                        content : 'There was an error uploading the file.'
                    });
                }
                me.options.eventPubSub.trigger('btnComplete', $('#pw-wsdl-addfile-btn'));
            });
            */
            me.options.eventPubSub.bind('enterpriseComplete', function(isPrevious){
                if(!isPrevious){
                    me.options.eventPubSub.trigger('PWNextTransition', 'enterprise');
                }
            });
        },
        events: {
            'click #pw-wsdl-addurl-btn' : 'addWebServiceURL',
            'click #pw-wsdl-list li i' : 'removeWSDL',
            'click #pw-wsdl-addfile-btn' : 'addWSDLFile'
        },
        // render wsdl list
        render: function(view, wsdl){
            this.startIndex = $('#pw-wsdl-list li').length;
            var list = $('#pw-wsdl-list');
            if(wsdl){
                var single = _.template($('#PWWSDLListView').html(), {
                    col : [wsdl]
                });
                list.prepend(single);
                var item = list.find('li[did="'+wsdl.attributes.magnetId+'"]');
                item.before('<li>');
                item.prev()
                    .width(item.width())
                    .height(item.height())
                    .css({
                        'position'         : 'absolute',
                        'background-color' : '#86EA83',
                        'opacity'          : '.4',
                        'margin'           : '0 0 0 5.3px'
                    }).fadeOut(1000, function(){
                        $(this).remove();
                    });
            }else{
                var multiple = _.template($('#PWWSDLListView').html(), {
                    col : this.wsdls.models
                });
                list.html(multiple);
            }
            if(view){
                this.options.eventPubSub.trigger('PWToggleAccordion', view);
            }
            return this;
        },
        // set an item from the webservice collection with the given magnet id
        setById: function(ary, magnetId, properties){
            for(var i=ary.length;i--;){
                if(ary[i].magnetId == magnetId){
                    $.extend(ary[i], properties);
                }
            }
        },
        updateStatus: function(){
            $('#pw-enterprise-status').html(this.wsdls.models.length > 0 ? this.wsdls.models.length + ' Services' : 'NONE');
        },
        retrieveWSDLs: function(){
            var me = this;
            me.wsdls = new ProjectCollection();
            me.wsdls.fetch({
                data : {
                    relationship : {
                        name     : 'webservices',
                        magnetId : this.project.attributes.magnetId
                    }
                },
                success: function(){
                    me.render(false);
                    me.updateStatus();
                },
                error: function(){
                }
            });
        },
        // validate url and create webservice entity related to the current project
        addWebServiceURL: function(){
            var me = this;
            var dom = me.$el.find('input[name="wsdl-url"]');
            var wsdlUrl = $.trim(dom.val());
            if(wsdlUrl.length > 0){
                if(RegexValidation.validate(wsdlUrl, 'url') === false){
                    Alerts.Error.display({
                        title   : 'Invalid Web Service URL',
                        content : 'The url you supplied is invalid.'
                    });
                }else{
                    $('.pw-wsdl-url-processing').removeClass('hidden').html('<li><span class="qq-upload-spinner"></span><span class="pw-wsdl-url-caption">'+wsdlUrl+'</span></li>').show();
                    me.options.mc.query('projects/'+me.project.attributes.magnetId+'/addWebServiceURL', 'POST', {
                        url : wsdlUrl
                    }, function(wsdl){
                        $('.pw-wsdl-url-processing').hide('fast');
                        var wsdl = new ServiceModel(wsdl);
                        me.wsdls.add(wsdl);
                        me.render(false, wsdl);
                        me.updateStatus();
                    }, null, null, function(){
                        $('.pw-wsdl-url-processing').hide('fast');
                        Alerts.Error.display({
                            title   : 'Error Storing Url',
                            content : 'There was an error storing the WSDL/WADL url. Please double check whether the url is valid. If the url is valid, this WSDL/WADL may be incompatible.'
                        });
                    });
                    dom.val('');
                }
            }else{
                Alerts.Error.display({
                    title   : 'Invalid WSDL/WADL Url',
                    content : 'The specified url is invalid.'
                });
            }
        },
        // fetch service from server and render wsdl list
        fetchService: function(urlList){
            var me = this;
            me.render(false, urlList);
            me.updateStatus();
        },
        // create new webservice entity and initiate upload event
        addWSDLFile: function(){
            var me = this;
            var btn = $('#pw-wsdl-addfile-btn');
            $('.qq-upload-cancel').hide();
            var hasIdentical = false;
            if(!btn.hasClass('disabled') && me.$el.find('.qq-upload-list li').length){
                me.options.eventPubSub.trigger('btnLoading', btn);
                var filename = me.$el.find('.qq-upload-file').text();
                $('#pw-wsdl-list li').each(function(){
                    if($.trim($(this).text()) == filename){
                        hasIdentical = true;
                    }
                });
                if(!hasIdentical){
                    me.createWSDL(filename, function(model){
                        me.options.eventPubSub.trigger('uploadWSDLFile', '/rest/webservices/'+model.attributes.magnetId+'/file', {
                            model    : model,
                            filename : filename
                        });
                    });
                }else{
                    $('.qq-upload-list').html('');
                    Alerts.Error.display({
                        title   : 'Duplicate File Selected',
                        content : 'The file selected to be uploaded cannot have the same filename as a previously uploaded WSDL.'
                    });
                    me.options.eventPubSub.trigger('btnComplete', btn);
                }
            }else{
                Alerts.Error.display({
                    title   : 'No File Selected',
                    content : 'No file has been selected.'
                });
                me.options.eventPubSub.trigger('btnComplete', btn);
            }
        },
        // create new empty olswebservice entity. and callback on success
        createWSDL: function(filename, callback){
            var me = this;
            var wsdl = new ProjectModel();
            wsdl.save({
                'name'        : filename,
                'description' : filename+' file'
            }, {
                data: {
                    relationship : {
                        name     : 'webservices',
                        magnetId : me.project.attributes.magnetId
                    }
                },
                success: function(wsdl){
                    callback(wsdl);
                },
                error: function(){
                    me.options.eventPubSub.trigger('btnComplete', $('#pw-wsdl-addfile-btn'));
                    Alerts.Error.display({
                        title   : 'Invalid WSDL',
                        content : 'The WSDL you provided could not be parsed. Please input the WSDL manually from the Magnet App Builder Tool.'
                    });
                }
            });  
        },
        // remove item from wsdl list and delete entity on the server
        removeWSDL: function(e){
            var me = this;
            var item = $(e.currentTarget).closest('li');
            var magnetId = item.attr('did');
            var wsdl = me.wsdls.where({
                magnetId : magnetId
            })[0];
            wsdl.urlRoot = 'wsdls';
            wsdl.destroy({
                success: function(){
                    item.hide('fast', function(){
                        $(this).remove();
                    });
                    me.updateStatus();
                }
            });
        }
    });
    return View;
});