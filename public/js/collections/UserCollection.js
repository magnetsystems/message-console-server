define(["jquery", "backbone", "models/UserModel"], function($, Backbone, UserModel){
    var Collection = Backbone.Collection.extend({
        model: UserModel,
        urlRoot: 'users',
        parse: function(res){
            this.paging = res.paging;
            return res.data;
        }
    });
    return Collection;
});