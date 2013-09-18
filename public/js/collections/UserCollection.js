define(["jquery", "backbone", "models/UserModel"], function($, Backbone, UserModel){
    var Collection = Backbone.Collection.extend({
        model: UserModel,
        urlRoot: 'users',
        parse: function(res){
            this.paging = res.paging;
            for(var i=res.data.length;i--;){
                if(res.data[i].lastModifiedTime){
                    res.data[i].formatTime = utils.ISO8601ToDT(res.data[i].lastModifiedTime);
                }
                if(res.data[i].latestAssetGeneratedTime){
                    res.data[i].formattedLatestAssetGeneratedTime = utils.ISO8601ToDT(res.data[i].latestAssetGeneratedTime);
                }
                if(res.data[i].createdTime){
                    res.data[i].formatCreatedTime = utils.ISO8601ToDT(res.data[i].createdTime);
                }
                if(res.data[i].profile){
                    res.data[i].profileName = res.data[i].profile.firstName+' '+res.data[i].profile.lastName;
                }
                if(res.data[i].accounts){
                    res.data[i].accountMagnetActive = res.data[i].accounts[0].magnetActive === false ? 'Deactivated' : '';
                }
            }
            return res.data;
        },
        format: function(str){
            return str < 10 ? '0'+str : str;
        }
    });
    return Collection;
});