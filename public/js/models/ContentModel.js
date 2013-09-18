define(["jquery", "backbone"], function($, Backbone){
    var View = Backbone.Model.extend({
        urlRoot: 'contents',
        parse: function(res){
            return res;
        }
    });
    return View;
});