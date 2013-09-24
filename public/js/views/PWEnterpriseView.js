define(['jquery', 'backbone', 'models/ProjectModel', 'models/ServiceModel', 'views/UploadView'], function($, Backbone, ProjectModel, ServiceModel, UploadView){
    var View = Backbone.View.extend({
        el: '#pw-enterprise',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initPWEnterpriseView', function(params){
                me.project = params.project;
                // create properties if they dont yet exist
                me.project.set({
                    contents    : me.project.attributes.contents || [],
                    webservices : me.project.attributes.webservices || []
                });
                me.updateStatus();
                me.render(params.view);
            });
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
            me.options.eventPubSub.bind('enterpriseComplete', function(isPrevious){
                me.storeDetails(isPrevious);
                if(!isPrevious){
                    me.options.eventPubSub.trigger('PWNextTransition', 'enterprise');
                }
            });
        },
        events: {
            'click #pw-wsdl-addurl-btn' : 'addWSDLUrl',
            'click #pw-wsdl-list li i' : 'removeWSDL',
            'click #pw-wsdl-addfile-btn' : 'addWSDLFile'
        },
        // render wsdl list
        render: function(view, model){
            this.startIndex = $('#pw-wsdl-list li').length;
            var list = $('#pw-wsdl-list');
            if(model){
                var single = _.template($('#PWWSDLListView').html(), {
                    webservices : [model.attributes]
                });
                list.prepend(single);
                var item = list.find('li[did="'+model.attributes.magnetId+'"]');
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
                    webservices : this.project.attributes.webservices
                });
                list.html(multiple);
            }
            if(view){
                this.options.eventPubSub.trigger('PWToggleAccordion', view);
            }
            return this;
        },
        // store project details form data into data object
        storeDetails: function(){
            var me = this;
            $('#pw-wsdl-list li').each(function(){
                var tableRow = $(this).find('input[type="radio"]:checked').closest('tr');
                var magnetId = tableRow.closest('li').attr('did');
                var properties = {
                    pathPrefix : $.trim($(this).find('input[name="pathPrefix"]').val())
                };
                if(tableRow.length){
                    $.extend(properties, utils.collect(tableRow).config);
                }
                me.options.mc.query('webservices/'+magnetId, 'PUT', properties, function(){
                    me.setById(me.project.get('webservices'), magnetId, properties);
                }, null, null, function(){
                    console.log('error');
                });
            });
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
            $('#pw-enterprise-status').html(this.project.attributes.webservices.length > 0 ? this.project.attributes.webservices.length + ' Services' : 'NONE');
        },
        // validate url and create webservice entity related to the current project
        addWSDLUrl: function(){
            var me = this;
            var dom = me.$el.find('input[name="wsdl-url"]');
            var wsdlUrl = $.trim(dom.val());
            if(wsdlUrl.length > 0){
                $('.pw-wsdl-url-processing').removeClass('hidden').html('<li><span class="qq-upload-spinner"></span><span class="pw-wsdl-url-caption">'+wsdlUrl+'</span></li>').show();
                var service = new ProjectModel({
                    magnetId : me.project.attributes.magnetId
                });
                service.save({
                    url : wsdlUrl
                }, {
                    data: {
                        relationship : {
                            name   : 'webservices', 
                            magnetId : me.project.attributes.magnetId
                        }
                    },
                    success: function(model){
                        me.fetchService(model);
                    },
                    error: function(){
                        Alerts.Error.display({
                            title   : 'Error Storing Url',
                            content : 'There was an error storing the WSDL/WADL url. Please double check whether the url is valid. If the url is valid, this WSDL/WADL may be incompatible.'
                        });
                        $('.pw-wsdl-url-processing').hide('fast');
                    }
                });        
                dom.val('');
            }else{
                Alerts.Error.display({
                    title   : 'Invalid WSDL/WADL Url',
                    content : 'The specified url is invalid.'
                });
            }
        },
        // fetch service from server and render wsdl list
        fetchService: function(model){
            var me = this;
            $('.pw-wsdl-url-processing').hide('fast');
            model.urlRoot = 'webservices';
            model.fetch({
                success: function(){
                    me.project.get('webservices').push(model.attributes);
                    me.render(false, model);
                    me.updateStatus();
                }, 
                error: function(){
                    console.log('error fetching webservice.');
                }
            });
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
                        title   : 'Error Storing File',
                        content : 'There was an error storing the file.'
                    });
                }
            });  
        },
        // remove item from wsdl list and delete entity on the server
        removeWSDL: function(e){
            var me = this;
            var item = $(e.currentTarget).closest('li');
            var magnetId = item.attr('did');
            var service = new ServiceModel({
                magnetId : magnetId,
                id     : magnetId.slice(magnetId.lastIndexOf(':')+1)
            });
            service.destroy({
                success: function(){
                    utils.removeByProp(me.project.get('webservices'), 'magnetId', magnetId);
                    item.hide('fast', function(){
                        $(this).remove();
                    });
                    me.updateStatus();
                },
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Deleting File',
                        content : 'There was an error deleting the file.'
                    });
                }
            });
        }
    });
    return View;
});