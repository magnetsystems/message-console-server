define(["jquery", "backbone", "models/AnnouncementModel"], function($, Backbone, AnnouncementModel){
    var Collection = Backbone.Collection.extend({
        model: AnnouncementModel,
        urlRoot: 'announcements',
        parse: function(res){
            this.paging = res.paging;
            return res.data;
        }
    });
    return Collection;
});