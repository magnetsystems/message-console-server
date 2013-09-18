define(["jquery", "backbone"], function($, Backbone){
    var View = Backbone.Model.extend({
        urlRoot: 'registration-tasks',
        parse: function(res){
            if(res){
                res.formattedCreationDate = utils.ISO8601ToDT(res.creationDate);
            }
            return res;
        }
    });
    return View;
});