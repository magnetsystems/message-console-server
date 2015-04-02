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

module.exports = new Helper();