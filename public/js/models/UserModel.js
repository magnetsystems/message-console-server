define(["jquery", "backbone"], function($, Backbone){
    var View = Backbone.Model.extend({
        urlRoot: 'users',
        parse: function(res){
            if(res.updatedAt){
                res.updatedAt = utils.ISO8601ToDT(res.updatedAt);
            }
            if(res.createdAt){
                res.createdAt = utils.ISO8601ToDT(res.createdAt);
            }
            if(res.firstName){
                res.profileName = res.firstName+' '+res.lastName;
            }
            return res;
        }
    });
    return View;
});