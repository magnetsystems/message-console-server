define(["jquery", "backbone"], function($, Backbone){
    var View = Backbone.Model.extend({
        urlRoot: 'apps',
        parse: function(res){
            return res;
        }
    });
    return View;
});