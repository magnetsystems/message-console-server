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
                    res.data[i].getConfig = '<a class="btn" href="/rest/projects/'+res.data[i].magnetId+'/getConfig">Download Magnet App Project Profile</a>';
                }
            }
            return res.data;
        }
    });
    return Collection;
});