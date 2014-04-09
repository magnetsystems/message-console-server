function Jobs(){
    this.cache = {};
}
// create a job
Jobs.prototype.create = function(id, interval, job){
    var me = this;
    me.cache[id] = {
        interval   : interval * 1000,
        out        : null,
        updatedAt  : null,
        nextUpdate : null,
        loop       : null
    };
    me.cache[id].job = job;
};
// start execution of a job in intervals
Jobs.prototype.start = function(id, callback){
    var me = this;
    me.refresh(id, function(job, hasFailed){
        me.cache[id].loop = setTimeout(function(){
            me.start(id, callback);
        }, me.cache[id].interval);
        if(typeof callback === typeof Function) callback(job, hasFailed);
    });
};
// execute a job
Jobs.prototype.refresh = function(id, callback){
    var me = this;
    me.cache[id].job({
        success : function(out){
            me.cache[id].out = out;
            me.cache[id].updatedAt = new Date();
            me.cache[id].nextUpdate = new Date();
            me.cache[id].nextUpdate.setSeconds(me.cache[id].updatedAt.getSeconds() + 10);
            if(typeof callback === typeof Function) callback(me.cache[id]);
        },
        error   : function(e){
            winston.error('Jobs: error executing job id: '+id+'.', e);
            if(typeof callback === typeof Function) callback(me.cache[id], true);
        }
    });
};
// stop execution of jobs
Jobs.prototype.stop = function(id){
    if(id)
        clearTimeout(this.cache[id].loop);
    else
        for(var job in this.cache)
            clearTimeout(job.loop);
};
// get cached value of a job
Jobs.prototype.get = function(id){
    return this.cache[id] ? this.cache[id].out : undefined;
};

module.exports = new Jobs();