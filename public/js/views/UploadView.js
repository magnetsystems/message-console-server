define(['jquery', 'backbone', 'backbone', 'fileuploader'], function($, Backbone){
    var View = Backbone.View.extend({
        el: '#upload-domid-placeholder',
        initialize: function(){
            var me = this;
            me.el = me.options.el;
            // ie < 10 will not support application/json since it is uploading from iframe
            var accepts = 'application/json';
            if($.browser.msie){
                accepts = 'text/plain';
            }
            // create upload component
            var uploader = new qq.FineUploader({
                multiple                    : false,
                maxConnections              : 1,
                forceMultipart              : false,
                disableCancelForFormUploads : true,
                autoUpload                  : false,
                element                     : document.getElementById(me.options.el.replace('#', '')),
                text: {
                    uploadButton : me.options.buttonName ? me.options.buttonName : 'Select a File'
                },
                // debug : true,
                request: {
                    endpoint      : '',
                    method        : me.options.method,
                    inputName     : 'filename'
                },
                dragAndDrop: {
                    disableDefaultDropzone : true
                },
                validation: me.options.validation,
                callbacks: {
                    onComplete: function(id, filename, res){
                        setTimeout(function(){
                            me.$el.find('.qq-upload-list li').hide('3000', function(){
                                $(this).remove();
                            });
                        }, 3000);
                        me.options.eventPubSub.trigger('upload'+me.options.context+'Complete', {
                            id       : id, 
                            filename : filename, 
                            params   : me.params,
                            res      : res
                        });
                    }
                }
            });
            me.$el.find('.qq-upload-button').addClass('btn');
            // bind upload event to set upload endpoint and upload files
            me.options.eventPubSub.bind('upload'+me.options.context, function(path, params){
                me.params = params;
                uploader.options.request.endpoint = path;
                uploader.uploadStoredFiles();
                
            });
        }
    });
    return View;
});