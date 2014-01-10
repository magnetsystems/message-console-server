define(["jquery", "backbone"], function($, Backbone){
    var View = Backbone.Model.extend({
        urlRoot: 'announcements',
        parse: function(res){
            if(res.updatedAt){
                res.updatedAt = utils.ISO8601ToDT(res.updatedAt);
            }
            if(res.createdAt){
                res.createdAt = utils.ISO8601ToDT(res.createdAt);
            }
            return res;
        }
    });
    return View;
});