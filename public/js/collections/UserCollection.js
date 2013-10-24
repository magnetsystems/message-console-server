define(["jquery", "backbone", "models/UserModel"], function($, Backbone, UserModel){
    var Collection = Backbone.Collection.extend({
        model: UserModel,
        urlRoot: 'users',
        parse: function(res){
            this.paging = res.paging;
            if(res.data){
                for(var i=res.data.length;i--;){
                    if(res.firstName){
                        res.profileName = res.firstName+' '+res.lastName;
                    }
                }
            }
            return res.data;
        }
    });
    return Collection;
});