ENV_CONFIG = require('../lib/config/config.json');

var MMXManager = require("../lib/MMXManager");
winston = require('winston');

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    level : 'silly'
});


describe('Set Up Helpers', function(){
    beforeAll = function(fn){
        it('[beforeAll]', fn);
    };

    afterAll = function(fn){
        it('[afterAll]', fn)
    };
});


var Helper = function(){};

Helper.prototype.deepCopy = function(obj){
    var copy;
    if(null == obj || 'object' != typeof obj) return obj;
    if(obj instanceof Date){
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }
    if(obj instanceof Array){
        copy = [];
        for(var i=0,len=obj.length;i<len;++i)
            copy[i] = this.deepCopy(obj[i]);
        return copy;
    }
    if(obj instanceof Object){
        copy = {};
        for(var attr in obj)
            if(obj.hasOwnProperty(attr)) copy[attr] = this.deepCopy(obj[attr]);
        return copy;
    }
    throw new Error('Unable to copy obj! Its type isn\'t supported.');
};

Helper.prototype.getByAttr = function(obj, key, val){
    var ary = [];
    for(var i=0;i<obj.length;++i){
        if(obj[i][key] === val || parseInt(obj[i][key]) === parseInt(val)){
            ary.push(obj[i]);
        }
    }
    return ary;
};

Helper.prototype.checkMessagingStatus = function(tries, cb){
    var me = this;
    tries = tries || 0;
    MMXManager.getConfigs('', function(e){
        if(e && tries > 10){
            console.log('checkMessagingStatus: failed');
            cb(e);
        }else if(e){
            tries += 1;
            console.log('checkMessagingStatus: trying again '+tries, e);
            setTimeout(function(){
                me.checkMessagingStatus(tries, cb);
            }, 1000);
        }else{
            console.log('checkMessagingStatus: done!');
            cb();
        }
    });
};


module.exports = new Helper();