define(["jquery", "backbone", "models/RegistrationTaskModel"], function($, Backbone, RegistrationTaskModel){
    var Collection = Backbone.Collection.extend({
        model: RegistrationTaskModel,
        urlRoot: 'registration-tasks',
        parse: function(res){
            this.paging = res.paging;
            for(var i=res.data.length;i--;){
                if(res.data[i].userInfo){
                    res.data[i].companyName = res.data[i].userInfo.companyName;
                    res.data[i].fullName = res.data[i].userInfo.firstName ? res.data[i].userInfo.firstName + ' ' + res.data[i].userInfo.lastName : '';
                    res.data[i].email = res.data[i].userInfo.eMails[0];
                }
            }
            return res.data;
        }
    });
    return Collection;
});