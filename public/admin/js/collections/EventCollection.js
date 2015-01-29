define(["jquery", "backbone", "models/EventModel"], function($, Backbone, EventModel){
    var Collection = Backbone.Collection.extend({
        model: EventModel,
        urlRoot: 'events',
        parse: function(res){
            this.paging = res.paging;
            return res.data;
        }
    });
    return Collection;
});