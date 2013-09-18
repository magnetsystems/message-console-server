define(["jquery", "backbone"], function($, Backbone){
    var View = Backbone.Model.extend({
        urlRoot: 'projects',
        parse: function(res){
            // add additional properties for relations
            if(res){
                if(res.contents){
                    res.contentUrls = {};
                    $.each(res.contents, function(i, obj){
                        var params = {
                            url      : obj['magnet-uri'].replace('magnet:', '/rest')+'/data',
                            filename : obj.name
                        };
                        if(obj.cloudUri){
                            params.url = obj.cloudUri;
                            params.filename = false;
                        }
                        switch(obj.description){
                            case 'Server projects' :
                                res.contentUrls.server = params;
                                break;
                            case 'iOS client project' :
                                res.contentUrls.ios = params;
                                break;
                            case 'server sandbox zip' :
                                res.contentUrls.sandbox = params;
                                break;
                            case 'Android client project' :
                                res.contentUrls.android = params;
                                break;
                        }
                    });
                }
                if(res.lastModifiedTime){
                    res.formatTime = utils.ISO8601ToDT(res.lastModifiedTime);
                }
                if(res.createdTime){
                    res.formatCreatedTime = utils.ISO8601ToDT(res.createdTime);
                }
                if(res.latestAssetGeneratedTime){
                    res.formattedLatestAssetGeneratedTime = utils.ISO8601ToDT(res.latestAssetGeneratedTime);
                }
            }
            return res;
        },
        format: function(str){
            return str < 10 ? '0'+str : str;
        }
    });
    return View;
});