define(['jquery', 'backbone', 'models/ProjectModel', 'models/ServiceModel', 'views/UploadView'], function($, Backbone, ProjectModel, ServiceModel, UploadView){
    var View = Backbone.View.extend({
        el: '#pw-enterprise',
        initialize: function(){
            var me = this;
            me.options.eventPubSub.bind('initPWEnterpriseView', function(params){
                me.project = params.project;
                me.urls = me.project.get('wsdlUrls') || [];
                me.updateStatus();
                me.render(params.view);
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
                me.storeDetails();
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
        render: function(view, url){
            this.startIndex = $('#pw-wsdl-list li').length;
            var list = $('#pw-wsdl-list');
            if(url){
                var single = _.template($('#PWWSDLListView').html(), {
                    urls : [url]
                });
                list.prepend(single);
                var item = list.find('li[did="'+url+'"]');
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
                    urls : this.urls
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
            var urls = [];
            $('#pw-wsdl-list li').each(function(){
                urls.push($(this).attr('did'));
            });
            var proj = new ProjectModel();
            proj.set({
                magnetId : me.project.attributes.magnetId,
                id       : me.project.attributes.id,
                wsdlUrls : urls
            });
            proj.save({
                success: function(){
                    me.project.set({
                        wsdlUrls : urls
                    });
                },
                error: function(){
                    Alerts.Error.display({
                        title   : 'Error Storing Urls',
                        content : 'There was an error storing the WSDL/WADL urls. Please double check whether the url is valid. If the url is valid, this WSDL/WADL may be incompatible.'
                    });
                }
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
            $('#pw-enterprise-status').html(this.urls.length > 0 ? this.urls.length + ' Services' : 'NONE');
        },
        // validate url and create webservice entity related to the current project
        addWSDLUrl: function(){
            var me = this;
            var dom = me.$el.find('input[name="wsdl-url"]');
            var wsdlUrl = $.trim(dom.val());
            if(wsdlUrl.length > 0){
                me.urls.push(wsdlUrl);
                dom.val('');
                me.render(false, wsdlUrl);
                /*
                $('.pw-wsdl-url-processing').removeClass('hidden').html('<li><span class="qq-upload-spinner"></span><span class="pw-wsdl-url-caption">'+wsdlUrl+'</span></li>').show();
                me.options.mc.query('projects/'+me.project.attributes.magnetId+'/addWSDL', 'POST', dom.val(), function(){
                    $('.pw-wsdl-url-processing').hide('fast');
                    var urls = me.project.get('wsdlUrls');
                    if(urls instanceof Array){
                        urls.push(dom.val());
                    }else{
                        me.project.set({
                           wsdlUrls : [dom.val()]
                        });
                    }
                }, null, null, function(){
                    $('.pw-wsdl-url-processing').hide('fast');
                    Alerts.Error.display({
                        title   : 'Error Storing Url',
                        content : 'There was an error storing the WSDL/WADL url. Please double check whether the url is valid. If the url is valid, this WSDL/WADL may be incompatible.'
                    });
                });
                me.project.save(properties.config, {
                    success: function(){
                        me.project.get('webservices').push(model.attributes);
                        me.render(false, model);
                        me.updateStatus();
                    },
                    error: function(){
                    }
                });
                dom.val('');
                */
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
            item.hide('fast', function(){
                $(this).remove();
            });
            me.updateStatus();
        }
    });
    return View;
});