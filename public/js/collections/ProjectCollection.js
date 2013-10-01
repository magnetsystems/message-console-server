define(["jquery", "backbone", "models/ProjectModel"], function($, Backbone, ProjectModel){
    var Collection = Backbone.Collection.extend({
        model: ProjectModel,
        urlRoot: 'projects',
        parse: function(res){
            this.paging = res.paging;
            if(res.data){
                for(var i=res.data.length;i--;){
                    if(res.data[i].updatedAt){
                        res.data[i].updatedAt = utils.ISO8601ToDT(res.data[i].updatedAt);
                    }
                    if(res.data[i].createdAt){
                        res.data[i].createdAt = utils.ISO8601ToDT(res.data[i].createdAt);
                    }
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