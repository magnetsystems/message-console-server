var http = require('http')
, https = require('https');

var Transport = function(){};

// default request options
Transport.prototype.options = {
    host    : 'localhost',
    port    : 3000,
    method  : 'GET',
    headers : {
        'Content-Type' : 'application/json'
    }
};

// request a remote url
Transport.prototype.request = function(options, data, callback){
    winston.info('Remote: performing external request to: ' + options.method + ' ' + options.path + (data ? ' with data: '+JSON.stringify(data) : ''));
    var protocol = options.port == 443 ? https : http;
    var req = protocol.request(this.extend({}, this.options, options), function(res){
        var output = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk){
            output += chunk;
        });
        res.on('end', function(){
            var obj = output;
            try{
                obj = JSON.parse(output);
            }catch(e){}
            callback(null, obj, res);
        });
    });
    req.on('error', function(e){
        winston.error('Remote: error receiving response: ', e);
        callback(e);
    });
    if(data) req.write(JSON.stringify(data),'utf8');
    req.end();
}

// simple function to merge objects
Transport.prototype.extend = function(target){
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source){
        for(var prop in source){
            target[prop] = source[prop];
        }
    });
    return target;
};

module.exports = new Transport();