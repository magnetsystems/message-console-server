define(["jquery", "backbone", "models/UserModel"], function($, Backbone, UserModel){
    var Collection = Backbone.Collection.extend({
        model: UserModel,
        urlRoot: 'users',
        parse: function(res){
            this.paging = res.paging;
            if(res.data){
                for(var i=res.data.length;i--;){
                    if(res.data[i].firstName){
                        res.data[i].profileName = res.data[i].firstName+' '+res.data[i].lastName;
                    }
                }
            }
            return res.data;
        }
    });
    return Collection;
});