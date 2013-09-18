define(["jquery", "backbone"], function($, Backbone){
    var View = Backbone.Model.extend({
        urlRoot: 'log-event-records',
        parse: function(res){
            return res;
        }
    });
    return View;
});