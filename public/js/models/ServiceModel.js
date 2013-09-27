define(["jquery", "backbone"], function($, Backbone){
    var View = Backbone.Model.extend({
        urlRoot: 'wsdls'
    });
    return View;
});