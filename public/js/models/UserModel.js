define(["jquery", "backbone"], function($, Backbone){
    var View = Backbone.Model.extend({
        urlRoot: 'users',
        parse: function(res){
            return res;
        }
    });
    return View;
});