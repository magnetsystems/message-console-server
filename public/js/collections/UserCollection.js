define(["jquery", "backbone", "models/UserModel"], function($, Backbone, UserModel){
    var Collection = Backbone.Collection.extend({
        model: UserModel,
        urlRoot: 'users',
        parse: function(res){
            this.paging = res.paging;
            return res.data;
        },
        format: function(str){
            return str < 10 ? '0'+str : str;
        }
    });
    return Collection;
});