define(["jquery", "backbone", "models/HistoryModel"], function($, Backbone, HistoryModel){
    var Collection = Backbone.Collection.extend({
        model: HistoryModel,
        urlRoot: 'log-event-records',
        parse: function(res){
            this.paging = res.paging;
            for(var i=res.data.length;i--;){
                if(res.data[i].timestamp){
                    res.data[i].timestamp = utils.ISO8601ToDT(res.data[i].timestamp);
                }
                if(res.data[i].attachment){
                    res.data[i].attachment = '<button class="btn attachment-link" did="/rest/log-event-records/'+res.data[i].magnetId+'/attachment"><i class="icon-file"></i></button>';
                }
            }
            return res.data;
        }
    });
    return Collection;
});