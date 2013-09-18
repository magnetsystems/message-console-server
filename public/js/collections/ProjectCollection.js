define(["jquery", "backbone", "models/ProjectModel"], function($, Backbone, ProjectModel){
    var Collection = Backbone.Collection.extend({
        model: ProjectModel,
        urlRoot: 'projects',
        parse: function(res){
            this.paging = res.paging;
            for(var i=res.data.length;i--;){
                if(res.data[i].lastModifiedTime){
                    res.data[i].formatTime = utils.ISO8601ToDT(res.data[i].lastModifiedTime);
                }
                if(res.data[i].latestAssetGeneratedTime){
                    res.data[i].formattedLatestAssetGeneratedTime = utils.ISO8601ToDT(res.data[i].latestAssetGeneratedTime);
                }
                if(res.data[i].createdTime){
                    res.data[i].formatCreatedTime = utils.ISO8601ToDT(res.data[i].createdTime);
                }
            }
            return res.data;
        },
        format: function(str){
            return str < 10 ? '0'+str : str;
        }
    });
    return Collection;
});