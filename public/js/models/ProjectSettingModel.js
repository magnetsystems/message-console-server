define(["jquery", "backbone"], function($, Backbone){
    var View = Backbone.Model.extend({
        urlRoot: 'project-settings',
        parse: function(res){
            return res;
        }
    });
    return View;
});