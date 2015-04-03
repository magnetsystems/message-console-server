ENV_CONFIG = require('../lib/config/config.json');

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

module.exports = new Helper();