define(["jquery", "backbone", "models/AppModel"], function($, Backbone, AppModel){
    var Collection = Backbone.Collection.extend({
        model: AppModel,
        urlRoot: 'apps',
        parse: function(res){
            this.paging = res.paging;
            return res.data;
        }
    });
    return Collection;
});